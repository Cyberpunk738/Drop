export type ConnectionState =
  | 'idle'
  | 'creating'
  | 'waiting'
  | 'connecting'
  | 'connected'
  | 'transferring'
  | 'completed'
  | 'disconnected'
  | 'reconnecting'
  | 'failed'
  | 'expired';

export interface DeviceInfo {
  browser: string;
  os: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  deviceName: string;
}

export interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  file?: File;
  progress: number; // 0 to 100
  status: 'pending' | 'transferring' | 'completed' | 'error' | 'cancelled';
  speed?: number; // bytes per second
  bytesTransferred?: number;
  timeRemaining?: number; // seconds
  blobUrl?: string;
  error?: string;
}

export interface FileMetadataHeader {
  type: 'file-header';
  fileId: string;
  name: string;
  size: number;
  fileType: string;
  totalChunks: number;
  chunkSize: number;
}

export interface FileTransferAck {
  type: 'file-ack' | 'file-complete' | 'transfer-cancel' | 'ping';
  fileId?: string;
}

export type SignalingMessage =
  | { type: 'room-created'; roomCode: string }
  | { type: 'room-joined'; roomCode: string; role: 'receiver'; peerInfo?: DeviceInfo }
  | { type: 'peer-joined'; peerInfo: DeviceInfo }
  | { type: 'offer'; sdp: RTCSessionDescriptionInit }
  | { type: 'answer'; sdp: RTCSessionDescriptionInit }
  | { type: 'ice-candidate'; candidate: RTCIceCandidateInit }
  | { type: 'peer-left'; reason?: string }
  | { type: 'error'; message: string };

export type ClientSignalingMessage =
  | { type: 'create-room'; peerInfo: DeviceInfo }
  | { type: 'join-room'; roomCode: string; peerInfo: DeviceInfo }
  | { type: 'offer'; roomCode: string; sdp: RTCSessionDescriptionInit }
  | { type: 'answer'; roomCode: string; sdp: RTCSessionDescriptionInit }
  | { type: 'ice-candidate'; roomCode: string; candidate: RTCIceCandidateInit }
  | { type: 'leave-room'; roomCode: string };
