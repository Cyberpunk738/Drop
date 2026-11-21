import type { Peer as PeerType, DataConnection } from "peerjs";
import { DeviceInfo } from "@/types";

const CONNECTION_TIMEOUT = 30_000;
const RETRY_DELAY = 2_000;
const ICE_DISCONNECT_GRACE = 5_000;

export interface PeerManagerCallbacks {
  onPeerOpen: () => void;
  onConnectionEstablished: (info?: DeviceInfo) => void;
  onConnectionLost: () => void;
  onRemoteDevice: (info: DeviceInfo) => void;
  onSessionEnded: () => void;
  onDataReceived: (data: string | ArrayBuffer) => void;
  onError: (message: string) => void;
}

async function preparePeer(id: string) {
  const { default: Peer } = await import("peerjs");
  const response = await fetch("/api/ice", {
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok)
    throw new Error("Could not load connection settings. Please retry.");
  const config = (await response.json()) as RTCConfiguration;
  return () => new Peer(id, { debug: 0, config });
}

export class PeerManager {
  private peer: PeerType | null = null;
  private connection: DataConnection | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private signalingTimer: ReturnType<typeof setTimeout> | undefined;
  private connectionTimer: ReturnType<typeof setTimeout> | undefined;
  private iceTimer: ReturnType<typeof setTimeout> | undefined;
  private generation = 0;
  private createPeer: (() => PeerType) | null = null;
  private hostId = "";
  private host = false;
  private guestId: string | null = null;
  private hasConnected = false;
  private reportedConnection = false;

  constructor(
    private localPeerInfo: DeviceInfo,
    private callbacks: PeerManagerCallbacks,
    private preparePeerFactory = preparePeer,
  ) {}

  private async open(code: string, host: boolean) {
    this.destroy();
    const generation = this.generation;
    const hostId = `drop-p2p-${code.toLowerCase()}`;
    const id = host ? hostId : `drop-guest-${crypto.randomUUID()}`;
    const createPeer = await this.preparePeerFactory(id);
    if (generation !== this.generation) return;

    this.host = host;
    this.hostId = hostId;
    this.createPeer = createPeer;
    this.openSignaling();
  }

  private openSignaling() {
    const peer = this.createPeer?.();
    if (!peer) return;
    this.peer = peer;
    this.watchSignaling(peer);

    peer.on("open", () => {
      if (this.peer !== peer) return;
      clearTimeout(this.signalingTimer);
      if (this.host) {
        if (!this.hasConnected) this.callbacks.onPeerOpen();
      } else {
        this.connectToHost();
      }
    });
    peer.on("connection", (conn) => {
      if (
        this.peer !== peer ||
        !this.host ||
        (this.guestId ? conn.peer !== this.guestId : this.connection !== null)
      ) {
        conn.close();
        return;
      }
      // The same guest may already be redialing while this device still
      // sees the old channel as open.
      if (this.connection) this.loseConnection(this.connection);
      this.setupConnection(conn);
    });
    peer.on("disconnected", () => {
      if (this.peer === peer) this.scheduleRetry();
    });
    peer.on("close", () => {
      if (this.peer === peer) this.scheduleRetry();
    });
    peer.on("error", (err) => {
      if (this.peer !== peer) return;
      if (err.type === "peer-unavailable") {
        if (this.connection && !this.isConnected())
          this.loseConnection(
            this.connection,
            "This Drop is unavailable. Check the code and keep the other device’s tab open.",
          );
        return;
      }
      if (this.hasConnected || this.isConnected()) {
        this.scheduleRetry();
        return;
      }
      this.fail(
        err.type === "unavailable-id"
          ? "That code is in use. Create a new Drop."
          : "Could not connect. Retry with both devices online.",
      );
    });
  }

  private watchSignaling(peer: PeerType) {
    clearTimeout(this.signalingTimer);
    this.signalingTimer = setTimeout(() => {
      if (this.peer !== peer || peer.open) return;
      if (!this.hasConnected) {
        this.fail(
          "Connection timed out. Check both devices are online and retry.",
        );
      } else if (!this.isConnected()) {
        this.peer = null;
        peer.destroy();
        this.scheduleRetry();
      }
    }, CONNECTION_TIMEOUT);
  }

  private connectToHost() {
    if (this.host || this.connection || !this.peer?.open) return;
    this.setupConnection(
      this.peer.connect(this.hostId, {
        reliable: true,
        metadata: { peerInfo: this.localPeerInfo },
      }),
    );
  }

  private scheduleRetry() {
    clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => this.reconnect(), RETRY_DELAY);
  }

  public reconnect() {
    if (!this.createPeer) return;
    clearTimeout(this.retryTimer);
    if (this.connection && this.reportedConnection && !this.isConnected())
      this.loseConnection(this.connection);
    const peer = this.peer;
    if (!peer || peer.destroyed) {
      this.openSignaling();
    } else if (peer.disconnected) {
      this.watchSignaling(peer);
      peer.reconnect();
    } else {
      this.connectToHost();
    }
  }

  public createRoom(code: string) {
    return this.open(code, true);
  }

  public joinRoom(code: string) {
    return this.open(code, false);
  }

  private setupConnection(conn: DataConnection) {
    const current = () => this.connection === conn;
    this.connection = conn;
    this.connectionTimer = setTimeout(() => {
      if (current())
        this.loseConnection(
          conn,
          "The devices could not start a transfer connection. Keep both tabs open and try the same Wi-Fi.",
        );
    }, CONNECTION_TIMEOUT);

    conn.on("open", () => {
      if (!current()) return;
      clearTimeout(this.connectionTimer);
      this.hasConnected = true;
      this.reportedConnection = true;
      if (this.host) this.guestId = conn.peer;
      this.send(
        JSON.stringify({
          type: "peer-info-handshake",
          peerInfo: this.localPeerInfo,
        }),
      );
      if (current())
        this.callbacks.onConnectionEstablished(
          (conn.metadata as { peerInfo?: DeviceInfo } | undefined)?.peerInfo,
        );
    });
    conn.on("data", (data) => {
      if (!current()) return;
      if (typeof data === "string") {
        let msg;
        try {
          msg = JSON.parse(data);
        } catch {
          // Let the transfer engine handle malformed transfer messages.
        }
        if (msg?.type === "peer-info-handshake") {
          if (msg.peerInfo) this.callbacks.onRemoteDevice(msg.peerInfo);
          return;
        }
        if (msg?.type === "session-ended") {
          this.destroy();
          this.callbacks.onSessionEnded();
          return;
        }
      }
      if (typeof data === "string" || data instanceof ArrayBuffer)
        this.callbacks.onDataReceived(data);
    });
    conn.on("close", () => this.loseConnection(conn));
    conn.on("error", () => this.loseConnection(conn));

    const rtc = conn.peerConnection;
    const monitorIce = () => {
      if (!current()) return;
      clearTimeout(this.iceTimer);
      if (
        rtc.iceConnectionState === "failed" ||
        rtc.iceConnectionState === "closed"
      )
        this.loseConnection(conn);
      else if (rtc.iceConnectionState === "disconnected")
        this.iceTimer = setTimeout(
          () => this.loseConnection(conn),
          ICE_DISCONNECT_GRACE,
        );
    };
    rtc.addEventListener("iceconnectionstatechange", monitorIce);
  }

  private loseConnection(
    conn: DataConnection,
    message = "Connection lost. Check both devices and retry.",
  ) {
    if (this.connection !== conn) return;
    this.closeConnection();
    if (!this.hasConnected) {
      if (!this.host) this.fail(message);
      return;
    }
    // A failed redial should leave the original interrupted file state intact.
    if (this.reportedConnection) {
      this.reportedConnection = false;
      this.callbacks.onConnectionLost();
    }
    if (this.peer && !this.peer.open && !this.peer.disconnected)
      this.watchSignaling(this.peer);
    this.scheduleRetry();
  }

  public send(data: string | ArrayBuffer) {
    const conn = this.connection;
    if (!conn || !this.isConnected()) {
      if (conn?.open) this.loseConnection(conn);
      return false;
    }
    try {
      conn.send(data);
      return this.connection === conn && this.isConnected();
    } catch {
      this.loseConnection(conn);
      return false;
    }
  }

  public getBufferedAmount() {
    const conn = this.connection;
    return conn?.dataChannel?.bufferedAmount ?? 0;
  }

  public isConnected() {
    return (
      this.connection?.open === true &&
      this.connection.dataChannel?.readyState === "open"
    );
  }

  private fail(message: string) {
    this.destroy();
    this.callbacks.onError(message);
  }

  private closeConnection() {
    clearTimeout(this.connectionTimer);
    clearTimeout(this.iceTimer);
    const conn = this.connection;
    this.connection = null;
    conn?.close();
  }

  public endSession() {
    this.send(JSON.stringify({ type: "session-ended" }));
    this.destroy();
  }

  public destroy() {
    this.generation++;
    clearTimeout(this.retryTimer);
    clearTimeout(this.signalingTimer);
    this.closeConnection();
    const peer = this.peer;
    this.peer = null;
    this.createPeer = null;
    this.guestId = null;
    this.hasConnected = false;
    this.reportedConnection = false;
    peer?.destroy();
  }
}
