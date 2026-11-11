export type ConnectionState =
  | "idle"
  | "creating"
  | "waiting"
  | "connecting"
  | "connected"
  | "transferring"
  | "completed"
  | "disconnected"
  | "reconnecting"
  | "failed"
  | "expired";

export interface DeviceInfo {
  browser: string;
  os: string;
  deviceType: "desktop" | "mobile" | "tablet";
  deviceName: string;
}

export interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  file?: File;
  progress: number; // 0 to 100
  status: "pending" | "transferring" | "completed" | "error" | "cancelled";
  speed?: number; // bytes per second
  bytesTransferred?: number;
  timeRemaining?: number; // seconds
  blobUrl?: string;
  error?: string;
}

export interface FileMetadataHeader {
  type: "file-header";
  fileId: string;
  name: string;
  size: number;
  fileType: string;
  totalChunks: number;
  chunkSize: number;
  checksum: string;
}
