import { ClientSignalingMessage, SignalingMessage } from "@/types";

export class SignalingClient {
  private ws: WebSocket | null = null;
  private url: string;
  private onMessageCallback: ((msg: SignalingMessage) => void) | null = null;
  private onOpenCallback: (() => void) | null = null;
  private onCloseCallback: (() => void) | null = null;
  private onErrorCallback: ((err: Event) => void) | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private shouldReconnect = true;

  constructor(url?: string) {
    if (url) {
      this.url = url;
    } else if (typeof window !== "undefined") {
      const isHttps = window.location.protocol === "https:";
      const host = window.location.hostname || "localhost";
      const wsProtocol = isHttps ? "wss:" : "ws:";
      this.url = `${wsProtocol}//${host}:3001`;
    } else {
      this.url = "ws://localhost:3001";
    }
  }

  public connect(callbacks: {
    onMessage: (msg: SignalingMessage) => void;
    onOpen?: () => void;
    onClose?: () => void;
    onError?: (err: Event) => void;
  }) {
    this.onMessageCallback = callbacks.onMessage;
    this.onOpenCallback = callbacks.onOpen || null;
    this.onCloseCallback = callbacks.onClose || null;
    this.onErrorCallback = callbacks.onError || null;
    this.shouldReconnect = true;

    this.createSocket();
  }

  private createSocket() {
    try {
      if (this.ws) {
        this.ws.close();
      }

      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log("[SignalingClient] Connected to signaling server");
        if (this.onOpenCallback) this.onOpenCallback();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as SignalingMessage;
          if (this.onMessageCallback) {
            this.onMessageCallback(msg);
          }
        } catch (err) {
          console.error("[SignalingClient] Error parsing message:", err);
        }
      };

      this.ws.onclose = () => {
        console.log("[SignalingClient] Disconnected from signaling server");
        if (this.onCloseCallback) this.onCloseCallback();
      };

      this.ws.onerror = (err) => {
        console.warn("[SignalingClient] WebSocket error:", err);
        if (this.onErrorCallback) this.onErrorCallback(err);
      };
    } catch (err) {
      console.error("[SignalingClient] Connection error:", err);
    }
  }

  public send(msg: ClientSignalingMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      console.warn("[SignalingClient] WebSocket not open, failed to send:", msg.type);
    }
  }

  public disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
