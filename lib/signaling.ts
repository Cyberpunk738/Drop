import { ClientSignalingMessage, SignalingMessage, DeviceInfo } from "@/types";

export interface SignalingCallbacks {
  onMessage: (msg: SignalingMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (err: any) => void;
}

export class SignalingClient {
  private ws: WebSocket | null = null;
  private wsUrl: string | null = null;
  private isHttpMode = false;
  private pollingTimer: NodeJS.Timeout | null = null;
  private lastMessageIndex = 0;
  private currentRoomCode: string | null = null;
  private currentRole: "host" | "guest" | null = null;
  private callbacks: SignalingCallbacks | null = null;
  private isActive = true;

  constructor() {
    // If explicitly configured with a WebSocket server URL (e.g. wss://my-signaling.onrender.com)
    if (process.env.NEXT_PUBLIC_SIGNALING_URL) {
      this.wsUrl = process.env.NEXT_PUBLIC_SIGNALING_URL;
    } else if (
      typeof window !== "undefined" &&
      window.location.hostname === "localhost" &&
      !window.location.port.includes("3000")
    ) {
      this.wsUrl = "ws://localhost:3001";
    } else {
      // Default to Next.js API serverless signaling (Works 100% on Vercel)
      this.isHttpMode = true;
    }
  }

  public connect(callbacks: SignalingCallbacks) {
    this.callbacks = callbacks;
    this.isActive = true;

    if (this.wsUrl && !this.isHttpMode) {
      this.connectWebSocket();
    } else {
      this.isHttpMode = true;
      if (this.callbacks.onOpen) {
        setTimeout(() => this.callbacks?.onOpen?.(), 10);
      }
    }
  }

  private connectWebSocket() {
    if (!this.wsUrl) return;
    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        if (this.callbacks?.onOpen) this.callbacks.onOpen();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as SignalingMessage;
          if (this.callbacks?.onMessage) this.callbacks.onMessage(msg);
        } catch (err) {
          console.error("[Signaling] WS parse error:", err);
        }
      };

      this.ws.onclose = () => {
        if (this.callbacks?.onClose) this.callbacks.onClose();
      };

      this.ws.onerror = (err) => {
        console.warn("[Signaling] WS failed, falling back to HTTP serverless signaling:", err);
        this.isHttpMode = true;
        if (this.callbacks?.onOpen) this.callbacks.onOpen();
      };
    } catch (err) {
      console.warn("[Signaling] WS error, fallback to HTTP:", err);
      this.isHttpMode = true;
      if (this.callbacks?.onOpen) this.callbacks.onOpen();
    }
  }

  public async send(msg: ClientSignalingMessage) {
    if (!this.isHttpMode && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
      return;
    }

    // HTTP Serverless Signaling Logic
    try {
      switch (msg.type) {
        case "create-room": {
          this.currentRole = "host";
          const res = await fetch("/api/signaling", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "create",
              peerInfo: msg.peerInfo,
            }),
          });
          const data = await res.json();
          if (data.status === "ok" && data.roomCode) {
            this.currentRoomCode = data.roomCode;
            this.lastMessageIndex = 0;
            this.callbacks?.onMessage({
              type: "room-created",
              roomCode: data.roomCode,
            });
            this.startPolling();
          } else {
            this.callbacks?.onMessage({
              type: "error",
              message: data.message || "Failed to create room.",
            });
          }
          break;
        }

        case "join-room": {
          this.currentRole = "guest";
          this.currentRoomCode = msg.roomCode.toUpperCase().trim();
          const res = await fetch("/api/signaling", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "join",
              roomCode: this.currentRoomCode,
              peerInfo: msg.peerInfo,
            }),
          });
          const data = await res.json();
          if (data.status === "ok") {
            this.lastMessageIndex = 0;
            this.callbacks?.onMessage({
              type: "room-joined",
              roomCode: data.roomCode,
              role: "receiver",
              peerInfo: data.hostInfo,
            });
            this.startPolling();
          } else {
            this.callbacks?.onMessage({
              type: "error",
              message: data.message || "Could not join room.",
            });
          }
          break;
        }

        case "offer":
        case "answer":
        case "ice-candidate": {
          const roomCode = msg.roomCode || this.currentRoomCode;
          if (!roomCode) return;

          await fetch("/api/signaling", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "send",
              roomCode,
              role: this.currentRole,
              message: msg,
            }),
          });
          break;
        }

        case "leave-room": {
          this.stopPolling();
          if (this.currentRoomCode) {
            fetch("/api/signaling", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "leave",
                roomCode: this.currentRoomCode,
                role: this.currentRole,
              }),
            }).catch(() => {});
          }
          break;
        }
      }
    } catch (err: any) {
      console.error("[SignalingClient] HTTP send error:", err);
      this.callbacks?.onError?.(err);
    }
  }

  private startPolling() {
    this.stopPolling();
    if (!this.isActive || !this.currentRoomCode || !this.currentRole) return;

    const poll = async () => {
      if (!this.isActive || !this.currentRoomCode) return;

      try {
        const res = await fetch("/api/signaling", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "poll",
            roomCode: this.currentRoomCode,
            role: this.currentRole,
            lastIndex: this.lastMessageIndex,
          }),
        });

        if (!res.ok) {
          // Room might be expired or closed
          if (res.status === 404 || res.status === 410) {
            this.callbacks?.onMessage({
              type: "error",
              message: "Session expired or closed.",
            });
            this.stopPolling();
            return;
          }
        }

        const data = await res.json();
        if (data.status === "ok" && Array.isArray(data.messages)) {
          this.lastMessageIndex = data.lastIndex;
          for (const item of data.messages) {
            if (item.type === "peer-joined") {
              this.callbacks?.onMessage({
                type: "peer-joined",
                peerInfo: item.payload.peerInfo,
              });
            } else if (item.type === "offer") {
              this.callbacks?.onMessage({
                type: "offer",
                sdp: item.payload.sdp,
              });
            } else if (item.type === "answer") {
              this.callbacks?.onMessage({
                type: "answer",
                sdp: item.payload.sdp,
              });
            } else if (item.type === "ice-candidate") {
              this.callbacks?.onMessage({
                type: "ice-candidate",
                candidate: item.payload.candidate,
              });
            } else if (item.type === "peer-left") {
              this.callbacks?.onMessage({
                type: "peer-left",
                reason: item.payload?.reason,
              });
              this.stopPolling();
            }
          }
        }
      } catch (err) {
        // Network poll glitch, will retry in next interval
      }

      if (this.isActive) {
        this.pollingTimer = setTimeout(poll, 300); // 300ms poll interval during handshake
      }
    };

    this.pollingTimer = setTimeout(poll, 150);
  }

  public stopPolling() {
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  public disconnect() {
    this.isActive = false;
    this.stopPolling();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public isConnected(): boolean {
    return this.isHttpMode ? true : this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
