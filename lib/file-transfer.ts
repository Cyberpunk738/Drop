import { FileItem, FileMetadataHeader } from "@/types";

export const CHUNK_SIZE = 64 * 1024;
export const MAX_BUFFERED_AMOUNT = 1024 * 1024;
// The portable download fallback assembles a Blob in memory. Keep this bounded.
export const MAX_FILE_SIZE = 100 * 1024 * 1024;
const TIMEOUT = 30_000;
export interface TransferProgressPayload {
  fileId: string;
  bytesTransferred: number;
  totalBytes: number;
  progress: number;
  speed: number;
  timeRemaining: number;
}
async function digest(data: ArrayBuffer): Promise<string> {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", data)),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
type Incoming = {
  header: FileMetadataHeader;
  chunks: ArrayBuffer[];
  bytes: number;
  started: number;
};
export class FileTransferEngine {
  constructor(private timeoutMs = TIMEOUT) {}
  private incoming: Incoming | null = null;
  private receivingReply: ((data: string | ArrayBuffer) => boolean) | null =
    null;
  private cancelled = false;
  private rejected = new Map<string, string>();
  private pending = new Map<
    string,
    { resolve: () => void; reject: (e: Error) => void }
  >();
  private urls = new Map<string, string>();
  private receiveQueue: Promise<void> = Promise.resolve();
  private generation = 0;
  private activeSend: {
    id: string;
    send: (data: string | ArrayBuffer) => boolean;
  } | null = null;

  public cancelTransfer() {
    this.cancelled = true;
    if (this.incoming) {
      this.receivingReply?.(
        JSON.stringify({
          type: "file-reject",
          fileId: this.incoming.header.fileId,
          message: "Receiver cancelled the transfer.",
        }),
      );
      this.incoming = null;
    }
    if (this.activeSend)
      this.activeSend.send(
        JSON.stringify({ type: "transfer-cancel", fileId: this.activeSend.id }),
      );
    for (const p of this.pending.values())
      p.reject(new Error("Transfer cancelled."));
    this.pending.clear();
  }
  public async sendFile(
    item: FileItem,
    send: (data: string | ArrayBuffer) => boolean,
    buffered: () => number,
    progress: (p: TransferProgressPayload) => void,
    complete: (id: string) => void,
    error: (id: string, message: string) => void,
  ): Promise<boolean> {
    if (this.activeSend) {
      error(item.id, "Another transfer is active.");
      return false;
    }
    this.cancelled = false;
    this.rejected.delete(item.id);
    this.activeSend = { id: item.id, send };
    let timer: ReturnType<typeof setTimeout> | undefined;
    let headerSent = false;
    try {
      const file = item.file;
      if (!file || file.size > MAX_FILE_SIZE)
        throw new Error("Choose a file up to 100 MB.");
      const checksum = await digest(await file.arrayBuffer());
      if (this.cancelled) throw new Error("Transfer cancelled.");
      const header = {
        type: "file-header",
        fileId: item.id,
        name: file.name,
        size: file.size,
        fileType: file.type || "application/octet-stream",
        chunkSize: CHUNK_SIZE,
        totalChunks: Math.ceil(file.size / CHUNK_SIZE),
        checksum,
      };
      if (!send(JSON.stringify(header)))
        throw new Error("Device disconnected. Reconnect and retry.");
      headerSent = true;
      const started = Date.now();
      let offset = 0;
      while (offset < file.size) {
        if (this.rejected.has(item.id))
          throw new Error(this.rejected.get(item.id));
        const waiting = Date.now();
        while (buffered() > MAX_BUFFERED_AMOUNT) {
          if (this.rejected.has(item.id))
            throw new Error(this.rejected.get(item.id));
          if (this.cancelled) throw new Error("Transfer cancelled.");
          if (Date.now() - waiting > this.timeoutMs)
            throw new Error("Transfer stalled. Reconnect and retry.");
          await new Promise((r) => setTimeout(r, 20));
        }
        if (this.cancelled) throw new Error("Transfer cancelled.");
        const chunk = await file
          .slice(offset, offset + CHUNK_SIZE)
          .arrayBuffer();
        if (this.cancelled) throw new Error("Transfer cancelled.");
        if (!send(chunk))
          throw new Error("Device disconnected. Reconnect and retry.");
        offset += chunk.byteLength;
        const speed = offset / Math.max((Date.now() - started) / 1000, 0.001);
        progress({
          fileId: item.id,
          bytesTransferred: offset,
          totalBytes: file.size,
          progress: Math.min(99, Math.round((offset / file.size) * 100)),
          speed,
          timeRemaining: (file.size - offset) / speed,
        });
      }
      if (this.rejected.has(item.id))
        throw new Error(this.rejected.get(item.id));
      // Install acknowledgement before sending completion (also supports synchronous test transports).
      const acknowledged = new Promise<void>((resolve, reject) => {
        this.pending.set(item.id, { resolve, reject });
        timer = setTimeout(
          () =>
            reject(
              new Error("Receiver did not confirm delivery. Retry the file."),
            ),
          this.timeoutMs,
        );
      });
      if (!send(JSON.stringify({ type: "file-complete", fileId: item.id }))) {
        this.pending
          .get(item.id)
          ?.reject(new Error("Device disconnected before confirmation."));
      }
      await acknowledged;
      complete(item.id);
      return true;
    } catch (e) {
      if (headerSent)
        send(JSON.stringify({ type: "transfer-cancel", fileId: item.id }));
      error(item.id, e instanceof Error ? e.message : "Transfer failed.");
      return false;
    } finally {
      clearTimeout(timer);
      this.pending.delete(item.id);
      this.rejected.delete(item.id);
      this.activeSend = null;
    }
  }

  public handleIncomingData(
    data: ArrayBuffer | string,
    incoming: (f: FileItem) => void,
    progress: (p: TransferProgressPayload) => void,
    received: (f: FileItem, b: Blob, url: string) => void,
    error: (s: string) => void,
    reply: (data: string | ArrayBuffer) => boolean = () => false,
  ): Promise<void> {
    const generation = this.generation;
    this.receiveQueue = this.receiveQueue
      .then(async () => {
        if (generation !== this.generation) return;
        if (typeof data === "string") {
          const msg = JSON.parse(data);
          if (msg.type === "file-ack") {
            this.pending.get(msg.fileId)?.resolve();
            return;
          }
          if (msg.type === "file-reject") {
            this.rejected.set(
              msg.fileId,
              msg.message || "Receiver rejected file.",
            );
            this.pending
              .get(msg.fileId)
              ?.reject(new Error(msg.message || "Receiver rejected file."));
            return;
          }
          if (msg.type === "transfer-cancel") {
            if (this.incoming?.header.fileId === msg.fileId) {
              this.incoming = null;
              error("Sender cancelled the transfer.");
            }
            return;
          }
          if (msg.type === "file-header") {
            if (
              this.incoming ||
              !Number.isSafeInteger(msg.size) ||
              msg.size < 0 ||
              msg.size > MAX_FILE_SIZE ||
              typeof msg.fileId !== "string" ||
              typeof msg.name !== "string" ||
              typeof msg.fileType !== "string" ||
              !/^[a-f0-9]{64}$/.test(msg.checksum) ||
              msg.chunkSize !== CHUNK_SIZE ||
              msg.totalChunks !== Math.ceil(msg.size / CHUNK_SIZE)
            ) {
              reply(
                JSON.stringify({
                  type: "file-reject",
                  fileId: msg.fileId,
                  message: "File is invalid, too large, or receiver is busy.",
                }),
              );
              return;
            }
            this.receivingReply = reply;
            this.incoming = {
              header: msg,
              chunks: [],
              bytes: 0,
              started: Date.now(),
            };
            incoming({
              id: msg.fileId,
              name: msg.name,
              size: msg.size,
              type: msg.fileType,
              progress: 0,
              status: "transferring",
              bytesTransferred: 0,
            });
          }
          if (
            msg.type === "file-complete" &&
            this.incoming?.header.fileId === msg.fileId
          ) {
            const state = this.incoming;
            if (!state) return;
            if (
              state.bytes !== state.header.size ||
              state.chunks.length !== state.header.totalChunks
            )
              throw new Error("Incomplete file received. Retry the file.");
            const blob = new Blob(state.chunks, {
              type: state.header.fileType,
            });
            if (
              (await digest(await blob.arrayBuffer())) !== state.header.checksum
            )
              throw new Error("File integrity check failed. Retry the file.");
            if (generation !== this.generation) return;
            const url = URL.createObjectURL(blob);
            const previousUrl = this.urls.get(state.header.fileId);
            if (previousUrl) URL.revokeObjectURL(previousUrl);
            this.urls.set(state.header.fileId, url);
            this.incoming = null;
            received(
              {
                id: state.header.fileId,
                name: state.header.name,
                size: blob.size,
                type: blob.type,
                progress: 100,
                status: "completed",
                bytesTransferred: blob.size,
                blobUrl: url,
              },
              blob,
              url,
            );
            reply(
              JSON.stringify({ type: "file-ack", fileId: state.header.fileId }),
            );
          }
        } else if (data instanceof ArrayBuffer && this.incoming) {
          const state = this.incoming;
          if (
            data.byteLength > CHUNK_SIZE ||
            data.byteLength === 0 ||
            state.bytes + data.byteLength > state.header.size
          )
            throw new Error("Invalid file chunk received.");
          state.chunks.push(data);
          state.bytes += data.byteLength;
          const speed =
            state.bytes / Math.max((Date.now() - state.started) / 1000, 0.001);
          progress({
            fileId: state.header.fileId,
            bytesTransferred: state.bytes,
            totalBytes: state.header.size,
            progress: Math.min(
              99,
              Math.round((state.bytes / state.header.size) * 100),
            ),
            speed,
            timeRemaining: (state.header.size - state.bytes) / speed,
          });
        }
      })
      .catch((e) => {
        if (this.incoming)
          reply(
            JSON.stringify({
              type: "file-reject",
              fileId: this.incoming.header.fileId,
              message: e.message,
            }),
          );
        this.incoming = null;
        error(e.message || "Invalid transfer message.");
      });
    return this.receiveQueue;
  }
  public reset() {
    this.generation++;
    this.cancelTransfer();
    this.incoming = null;
    for (const url of this.urls.values()) URL.revokeObjectURL(url);
    this.urls.clear();
  }
}
