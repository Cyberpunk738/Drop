import type { Peer as PeerType, DataConnection } from "peerjs";
import { DeviceInfo } from "@/types";

export interface PeerManagerCallbacks {
  onPeerOpen: (peerId: string) => void;
  onConnectionEstablished: (remotePeerInfo?: DeviceInfo) => void;
  onConnectionClosed: () => void;
  onDataReceived: (data: any) => void;
  onError: (error: string) => void;
}

export class PeerManager {
  private peer: PeerType | null = null;
  private connection: DataConnection | null = null;
  private callbacks: PeerManagerCallbacks;
  private localPeerInfo: DeviceInfo;

  constructor(localPeerInfo: DeviceInfo, callbacks: PeerManagerCallbacks) {
    this.localPeerInfo = localPeerInfo;
    this.callbacks = callbacks;
  }

  // Host: Create Drop Session with 5-character Code
  public async createRoom(roomCode: string): Promise<void> {
    this.destroy();

    const { default: Peer } = await import("peerjs");
    const peerId = `drop-p2p-${roomCode.toLowerCase()}`;

    try {
      const peer = new Peer(peerId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" },
          ],
        },
      });

      this.peer = peer;

      peer.on("open", (id) => {
        console.log("[PeerManager] Host peer created with ID:", id);
        this.callbacks.onPeerOpen(id);
      });

      peer.on("connection", (conn) => {
        console.log("[PeerManager] Guest connecting...");
        this.setupConnection(conn, true);
      });

      peer.on("error", (err: any) => {
        console.error("[PeerManager] Host Peer error:", err);
        if (err.type === "unavailable-id") {
          this.callbacks.onError("This room code is already active. Please generate a new one.");
        } else {
          this.callbacks.onError(err.message || "Failed to initialize P2P session.");
        }
      });
    } catch (err: any) {
      console.error("[PeerManager] Init error:", err);
      this.callbacks.onError(err.message || "Could not initialize WebRTC peer.");
    }
  }

  // Guest: Connect to Host using 5-character Code
  public async joinRoom(roomCode: string): Promise<void> {
    this.destroy();

    const { default: Peer } = await import("peerjs");
    const targetPeerId = `drop-p2p-${roomCode.toLowerCase()}`;

    try {
      const guestId = `drop-guest-${Math.random().toString(36).substring(2, 8)}`;
      const peer = new Peer(guestId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" },
          ],
        },
      });

      this.peer = peer;

      peer.on("open", () => {
        console.log("[PeerManager] Guest peer open, connecting to host:", targetPeerId);
        const conn = peer.connect(targetPeerId, {
          reliable: true,
          metadata: { peerInfo: this.localPeerInfo },
        });

        this.setupConnection(conn, false);
      });

      peer.on("error", (err: any) => {
        console.error("[PeerManager] Guest Peer error:", err);
        if (err.type === "peer-unavailable") {
          this.callbacks.onError("This Drop doesn't exist or has expired. Check code.");
        } else {
          this.callbacks.onError(err.message || "Connection to host failed.");
        }
      });
    } catch (err: any) {
      console.error("[PeerManager] Join error:", err);
      this.callbacks.onError(err.message || "Could not connect to Drop.");
    }
  }

  private setupConnection(conn: DataConnection, isHost: boolean) {
    this.connection = conn;

    conn.on("open", () => {
      console.log("[PeerManager] Data connection OPENED!");

      // If guest, send device info metadata
      if (!isHost) {
        conn.send(JSON.stringify({ type: "peer-info-handshake", peerInfo: this.localPeerInfo }));
      }

      const remoteInfo = (conn.metadata as any)?.peerInfo;
      this.callbacks.onConnectionEstablished(remoteInfo);
    });

    conn.on("data", (data: any) => {
      // Check for internal peer info handshake
      if (typeof data === "string") {
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === "peer-info-handshake") {
            this.callbacks.onConnectionEstablished(parsed.peerInfo);
            return;
          }
        } catch {}
      }

      this.callbacks.onDataReceived(data);
    });

    conn.on("close", () => {
      console.log("[PeerManager] Data connection closed");
      this.callbacks.onConnectionClosed();
    });

    conn.on("error", (err) => {
      console.error("[PeerManager] Connection error:", err);
      this.callbacks.onError("Data channel error occurred.");
    });
  }

  public send(data: any): boolean {
    if (!this.connection || !this.connection.open) {
      return false;
    }
    try {
      this.connection.send(data);
      return true;
    } catch (err) {
      console.error("[PeerManager] Send error:", err);
      return false;
    }
  }

  public getBufferedAmount(): number {
    const rawChannel = (this.connection as any)?.dataChannel;
    return rawChannel?.bufferedAmount || 0;
  }

  public isConnected(): boolean {
    return !!this.connection && this.connection.open;
  }

  public destroy() {
    if (this.connection) {
      try {
        this.connection.close();
      } catch {}
      this.connection = null;
    }
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {}
      this.peer = null;
    }
  }
}
