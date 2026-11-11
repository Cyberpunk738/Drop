import type { Peer as PeerType, DataConnection } from "peerjs";
import { DeviceInfo } from "@/types";
export interface PeerManagerCallbacks {
  onPeerOpen: (id: string) => void;
  onConnectionEstablished: (info?: DeviceInfo) => void;
  onConnectionClosed: () => void;
  onDataReceived: (data: unknown) => void;
  onError: (message: string) => void;
}
export class PeerManager {
  private peer: PeerType | null = null;
  private connection: DataConnection | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private generation = 0;
  constructor(
    private localPeerInfo: DeviceInfo,
    private callbacks: PeerManagerCallbacks,
  ) {}
  private async open(code: string, host: boolean) {
    this.destroy();
    const generation = this.generation;
    const { default: Peer } = await import("peerjs");
    const response = await fetch("/api/ice", {
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok)
      throw new Error("Could not load connection settings. Please retry.");
    const config = (await response.json()) as RTCConfiguration;
    if (generation !== this.generation) return;
    const peer = new Peer(
      host
        ? `drop-p2p-${code.toLowerCase()}`
        : `drop-guest-${crypto.randomUUID()}`,
      { debug: 0, config },
    );
    this.peer = peer;
    const current = () => generation === this.generation;
    this.timer = setTimeout(() => {
      if (!current()) return;
      this.destroy();
      this.callbacks.onError(
        "Connection timed out. Check both devices are online, then try a new Drop.",
      );
    }, 30_000);
    peer.on("open", (id) => {
      if (!current()) return;
      if (host) {
        clearTimeout(this.timer);
        this.callbacks.onPeerOpen(id);
      } else
        this.setupConnection(
          peer.connect(`drop-p2p-${code.toLowerCase()}`, {
            reliable: true,
            metadata: { peerInfo: this.localPeerInfo },
          }),
          generation,
        );
    });
    peer.on("connection", (conn) => {
      if (!current() || this.connection) {
        conn.close();
        return;
      }
      this.setupConnection(conn, generation);
    });
    peer.on("disconnected", () => {
      if (current() && !peer.destroyed) peer.reconnect();
    });
    peer.on("error", (err) => {
      if (!current()) return;
      // An established data channel can survive a signaling outage.
      if (
        this.connection?.open &&
        [
          "network",
          "disconnected",
          "server-error",
          "socket-error",
          "socket-closed",
        ].includes(err.type)
      )
        return;
      this.destroy();
      this.callbacks.onError(
        err.type === "peer-unavailable"
          ? "This Drop is unavailable. Check the code and keep the other device’s tab open."
          : err.type === "unavailable-id"
            ? "That code is in use. Create a new Drop."
            : "Could not connect. Retry with both devices online.",
      );
    });
  }
  public createRoom(code: string) {
    return this.open(code, true);
  }
  public joinRoom(code: string) {
    return this.open(code, false);
  }
  private setupConnection(conn: DataConnection, generation: number) {
    this.connection = conn;
    const current = () =>
      generation === this.generation && this.connection === conn;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (current()) {
        this.destroy();
        this.callbacks.onError(
          "The other device did not finish connecting. Try a new Drop.",
        );
      }
    }, 30_000);
    conn.on("open", () => {
      if (!current()) return;
      clearTimeout(this.timer);
      conn.send(
        JSON.stringify({
          type: "peer-info-handshake",
          peerInfo: this.localPeerInfo,
        }),
      );
      this.callbacks.onConnectionEstablished(
        (conn.metadata as { peerInfo?: DeviceInfo } | undefined)?.peerInfo,
      );
    });
    conn.on("data", (data) => {
      if (!current()) return;
      if (typeof data === "string") {
        try {
          const msg = JSON.parse(data);
          if (msg.type === "peer-info-handshake") {
            this.callbacks.onConnectionEstablished(msg.peerInfo);
            return;
          }
        } catch {
          /* Transfer engine validates other messages. */
        }
      }
      if (typeof data === "string" || data instanceof ArrayBuffer)
        this.callbacks.onDataReceived(data);
    });
    conn.on("close", () => {
      if (current()) {
        clearTimeout(this.timer);
        this.connection = null;
        this.callbacks.onConnectionClosed();
      }
    });
    conn.on("error", () => {
      if (current()) {
        this.destroy();
        this.callbacks.onError("Connection lost. Start a new Drop to retry.");
      }
    });
  }
  public send(data: string | ArrayBuffer) {
    if (!this.connection?.open) return false;
    try {
      this.connection.send(data);
      return true;
    } catch {
      return false;
    }
  }
  public getBufferedAmount() {
    return this.connection?.dataChannel?.bufferedAmount || 0;
  }
  public isConnected() {
    return !!this.connection?.open;
  }
  public destroy() {
    this.generation++;
    clearTimeout(this.timer);
    const conn = this.connection;
    const peer = this.peer;
    this.connection = null;
    this.peer = null;
    conn?.close();
    peer?.destroy();
  }
}
