import { FileItem, FileMetadataHeader } from "@/types";
import { sounds } from "./audio";

export const CHUNK_SIZE = 64 * 1024; // 64 KB per chunk
export const MAX_BUFFERED_AMOUNT = 1024 * 1024; // 1 MB buffer limit

export interface TransferProgressPayload {
  fileId: string;
  bytesTransferred: number;
  totalBytes: number;
  progress: number;
  speed: number; // bytes/sec
  timeRemaining: number; // seconds
}

export class FileTransferEngine {
  private receivingFiles = new Map<
    string,
    {
      header: FileMetadataHeader;
      chunks: ArrayBuffer[];
      receivedBytes: number;
      startTime: number;
      lastSpeedCheckTime: number;
      lastSpeedCheckBytes: number;
      currentSpeed: number;
    }
  >();

  private activeReceivingFileId: string | null = null;
  private isSenderCancelled = false;

  public cancelTransfer() {
    this.isSenderCancelled = true;
  }

  // Sender: Stream file chunks over WebRTC DataChannel
  public async sendFile(
    fileItem: FileItem,
    sendRaw: (data: string | ArrayBuffer) => boolean,
    getBufferedAmount: () => number,
    onProgress: (payload: TransferProgressPayload) => void,
    onComplete: (fileId: string) => void,
    onError: (fileId: string, error: string) => void
  ): Promise<void> {
    const file = fileItem.file;
    if (!file) {
      onError(fileItem.id, "No file handle found");
      return;
    }

    this.isSenderCancelled = false;
    const totalBytes = file.size;
    const totalChunks = Math.ceil(totalBytes / CHUNK_SIZE);

    // 1. Send file metadata header
    const header: FileMetadataHeader = {
      type: "file-header",
      fileId: fileItem.id,
      name: file.name,
      size: file.size,
      fileType: file.type || "application/octet-stream",
      totalChunks,
      chunkSize: CHUNK_SIZE,
    };

    const headerSent = sendRaw(JSON.stringify(header));
    if (!headerSent) {
      onError(fileItem.id, "Failed to send file header over data channel.");
      return;
    }

    let offset = 0;
    let chunkIndex = 0;
    let bytesSent = 0;
    const startTime = Date.now();
    let lastSpeedTime = startTime;
    let lastSpeedBytes = 0;
    let currentSpeed = 0;

    // 2. Stream chunks
    while (offset < totalBytes) {
      if (this.isSenderCancelled) {
        sendRaw(JSON.stringify({ type: "transfer-cancel", fileId: fileItem.id }));
        onError(fileItem.id, "Transfer cancelled by user.");
        return;
      }

      // Backpressure check: wait if buffer exceeds threshold
      while (getBufferedAmount() > MAX_BUFFERED_AMOUNT) {
        await new Promise((resolve) => setTimeout(resolve, 20));
      }

      const slice = file.slice(offset, offset + CHUNK_SIZE);
      const chunkBuffer = await slice.arrayBuffer();

      const success = sendRaw(chunkBuffer);
      if (!success) {
        onError(fileItem.id, "Data channel error while streaming chunks.");
        return;
      }

      offset += chunkBuffer.byteLength;
      bytesSent += chunkBuffer.byteLength;
      chunkIndex++;

      // Compute speed and progress every 150ms or at completion
      const now = Date.now();
      const elapsedSinceSpeed = (now - lastSpeedTime) / 1000;
      if (elapsedSinceSpeed >= 0.2 || offset >= totalBytes) {
        const bytesDelta = bytesSent - lastSpeedBytes;
        currentSpeed = elapsedSinceSpeed > 0 ? bytesDelta / elapsedSinceSpeed : 0;
        lastSpeedTime = now;
        lastSpeedBytes = bytesSent;

        const remainingBytes = Math.max(0, totalBytes - bytesSent);
        const eta = currentSpeed > 0 ? remainingBytes / currentSpeed : 0;
        const progress = Math.min(100, Math.round((bytesSent / totalBytes) * 100));

        onProgress({
          fileId: fileItem.id,
          bytesTransferred: bytesSent,
          totalBytes,
          progress,
          speed: currentSpeed,
          timeRemaining: eta,
        });
      }

      // Give event loop a micro-yield
      if (chunkIndex % 16 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    // 3. Send file completion message
    sendRaw(JSON.stringify({ type: "file-complete", fileId: fileItem.id }));
    sounds.complete();
    onComplete(fileItem.id);
  }

  // Receiver: Handle incoming data (Header, Binary Chunk, Complete)
  public handleIncomingData(
    data: ArrayBuffer | string,
    onIncomingFileHeader: (fileItem: FileItem) => void,
    onProgress: (payload: TransferProgressPayload) => void,
    onFileReceived: (fileItem: FileItem, blob: Blob, blobUrl: string) => void,
    onError: (error: string) => void
  ) {
    if (typeof data === "string") {
      try {
        const msg = JSON.parse(data);

        if (msg.type === "file-header") {
          const header = msg as FileMetadataHeader;
          this.receivingFiles.set(header.fileId, {
            header,
            chunks: [],
            receivedBytes: 0,
            startTime: Date.now(),
            lastSpeedCheckTime: Date.now(),
            lastSpeedCheckBytes: 0,
            currentSpeed: 0,
          });
          this.activeReceivingFileId = header.fileId;

          const incomingFileItem: FileItem = {
            id: header.fileId,
            name: header.name,
            size: header.size,
            type: header.fileType,
            progress: 0,
            status: "transferring",
            bytesTransferred: 0,
          };
          onIncomingFileHeader(incomingFileItem);
        } else if (msg.type === "file-complete") {
          const fileId = msg.fileId || this.activeReceivingFileId;
          if (fileId) {
            this.finishReceivingFile(fileId, onFileReceived, onError);
          }
        } else if (msg.type === "transfer-cancel") {
          const fileId = msg.fileId || this.activeReceivingFileId;
          if (fileId) {
            this.receivingFiles.delete(fileId);
            onError("Sender cancelled the transfer.");
          }
        }
      } catch (err) {
        console.error("[FileTransferEngine] Error handling message:", err);
      }
      return;
    }

    // Binary Chunk received
    if (data instanceof ArrayBuffer) {
      const fileId = this.activeReceivingFileId;
      if (!fileId) return;

      const state = this.receivingFiles.get(fileId);
      if (!state) return;

      state.chunks.push(data);
      state.receivedBytes += data.byteLength;

      const totalBytes = state.header.size;
      const now = Date.now();
      const elapsedSinceSpeed = (now - state.lastSpeedCheckTime) / 1000;

      if (elapsedSinceSpeed >= 0.2 || state.receivedBytes >= totalBytes) {
        const bytesDelta = state.receivedBytes - state.lastSpeedCheckBytes;
        state.currentSpeed = elapsedSinceSpeed > 0 ? bytesDelta / elapsedSinceSpeed : 0;
        state.lastSpeedCheckTime = now;
        state.lastSpeedCheckBytes = state.receivedBytes;

        const remainingBytes = Math.max(0, totalBytes - state.receivedBytes);
        const eta = state.currentSpeed > 0 ? remainingBytes / state.currentSpeed : 0;
        const progress = Math.min(100, Math.round((state.receivedBytes / totalBytes) * 100));

        onProgress({
          fileId,
          bytesTransferred: state.receivedBytes,
          totalBytes,
          progress,
          speed: state.currentSpeed,
          timeRemaining: eta,
        });
      }

      // Auto-finish if all bytes/chunks collected
      if (state.chunks.length >= state.header.totalChunks || state.receivedBytes >= totalBytes) {
        this.finishReceivingFile(fileId, onFileReceived, onError);
      }
    }
  }

  private finishReceivingFile(
    fileId: string,
    onFileReceived: (fileItem: FileItem, blob: Blob, blobUrl: string) => void,
    onError: (error: string) => void
  ) {
    const state = this.receivingFiles.get(fileId);
    if (!state) return;

    try {
      const blob = new Blob(state.chunks, {
        type: state.header.fileType || "application/octet-stream",
      });
      const blobUrl = URL.createObjectURL(blob);

      const completedItem: FileItem = {
        id: fileId,
        name: state.header.name,
        size: state.header.size,
        type: state.header.fileType,
        progress: 100,
        status: "completed",
        bytesTransferred: state.header.size,
        blobUrl,
      };

      this.receivingFiles.delete(fileId);
      if (this.activeReceivingFileId === fileId) {
        this.activeReceivingFileId = null;
      }

      sounds.complete();
      onFileReceived(completedItem, blob, blobUrl);

      // Auto-trigger browser download
      this.triggerBrowserDownload(blobUrl, state.header.name);
    } catch (err) {
      console.error("[FileTransferEngine] Error reassembling file:", err);
      onError("Failed to reconstruct file Blob.");
    }
  }

  public triggerBrowserDownload(blobUrl: string, filename: string) {
    if (typeof document === "undefined") return;
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
    }, 100);
  }

  public reset() {
    this.receivingFiles.clear();
    this.activeReceivingFileId = null;
    this.isSenderCancelled = false;
  }
}
