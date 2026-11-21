import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import type { Peer } from "peerjs";
import { PeerManager } from "../lib/peer-manager";

const device = {
  browser: "Browser",
  os: "Test",
  deviceType: "mobile" as const,
  deviceName: "Test phone",
};

class TestConnection extends EventEmitter {
  open = false;
  dataChannel = { readyState: "connecting", bufferedAmount: 0 };
  peerConnection = Object.assign(new EventTarget(), {
    iceConnectionState: "new",
  });
  sent: (string | ArrayBuffer)[] = [];

  constructor(readonly peer: string) {
    super();
  }

  openChannel() {
    this.open = true;
    this.dataChannel.readyState = "open";
    this.emit("open");
  }

  setIceState(state: string) {
    this.peerConnection.iceConnectionState = state;
    this.peerConnection.dispatchEvent(new Event("iceconnectionstatechange"));
  }

  close() {
    const wasOpen = this.open;
    this.open = false;
    this.dataChannel.readyState = "closed";
    if (wasOpen) this.emit("close");
  }

  send(data: string | ArrayBuffer) {
    this.sent.push(data);
  }
}

class TestPeer extends EventEmitter {
  open = false;
  destroyed = false;
  disconnected = false;
  dials: TestConnection[] = [];

  constructor(readonly id: string) {
    super();
  }

  connect(id: string) {
    const connection = new TestConnection(id);
    this.dials.push(connection);
    return connection;
  }

  signalReady() {
    this.open = true;
    this.disconnected = false;
    this.emit("open");
  }

  loseSignaling() {
    this.open = false;
    this.disconnected = true;
    this.emit("error", { type: "network" });
    this.emit("disconnected");
  }

  reconnect() {
    this.signalReady();
  }

  destroy() {
    this.destroyed = true;
    for (const conn of this.dials) conn.close();
    this.emit("close");
  }
}

function fixture() {
  const peers: TestPeer[] = [];
  const events: string[] = [];
  const manager = new PeerManager(
    device,
    {
      onPeerOpen: () => events.push("waiting"),
      onConnectionEstablished: () => events.push("connected"),
      onConnectionLost: () => events.push("lost"),
      onRemoteDevice: () => events.push("peer-info"),
      onSessionEnded: () => events.push("ended"),
      onDataReceived: () => events.push("data"),
      onError: (error) => events.push(error),
    },
    async (id) => () => {
      const peer = new TestPeer(id);
      peers.push(peer);
      return peer as unknown as Peer;
    },
  );
  return { manager, peers, events };
}

test("guest recovers signaling and rejoins the same Drop after its data channel closes", async (t) => {
  const { manager, peers, events } = fixture();
  t.after(() => manager.destroy());
  await manager.joinRoom("AB234");
  const [peer] = peers;
  peer.signalReady();
  const [first] = peer.dials;
  first.openChannel();
  peer.loseSignaling();
  assert.equal(manager.isConnected(), true);
  assert.equal(manager.send("payload"), true);
  assert.equal(first.sent.at(-1), "payload");
  manager.reconnect();
  assert.equal(peer.dials.length, 1);
  assert.deepEqual(events, ["connected"]);

  first.close();
  assert.equal(manager.send("while waiting"), false);
  assert.deepEqual(events, ["connected", "lost"]);
  manager.reconnect();
  manager.reconnect();
  assert.equal(peer.dials.length, 2);
  const replacement = peer.dials[1];
  assert.equal(replacement.peer, first.peer);
  replacement.openChannel();
  first.emit("data", "obsolete");
  assert.equal(manager.send("retry"), true);
  assert.equal(replacement.sent.at(-1), "retry");
  assert.deepEqual(events, ["connected", "lost", "connected"]);
});

test("redial waits and tries again after a failed reconnect without leaving the session", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { manager, peers, events } = fixture();
  t.after(() => manager.destroy());
  await manager.joinRoom("AB234");
  const [peer] = peers;
  peer.signalReady();
  peer.dials[0].openChannel();
  peer.dials[0].close();
  t.mock.timers.tick(2_000);
  assert.equal(peer.dials.length, 2);
  peer.emit("error", { type: "peer-unavailable" });
  assert.deepEqual(events, ["connected", "lost"]);
  t.mock.timers.tick(2_000);
  assert.equal(peer.dials.length, 3);
  peer.dials[2].openChannel();
  assert.deepEqual(events, ["connected", "lost", "connected"]);
});

test("a healthy channel survives a brief ICE interruption and recovers after sustained loss", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { manager, peers, events } = fixture();
  t.after(() => manager.destroy());
  await manager.joinRoom("AB234");
  const [peer] = peers;
  peer.signalReady();
  const [first] = peer.dials;
  first.openChannel();
  first.setIceState("disconnected");
  t.mock.timers.tick(2_000);
  first.setIceState("connected");
  t.mock.timers.tick(5_000);
  assert.equal(manager.isConnected(), true);

  first.setIceState("disconnected");
  t.mock.timers.tick(5_000);
  assert.equal(manager.isConnected(), false);
  assert.deepEqual(events, ["connected", "lost"]);
  t.mock.timers.tick(2_000);
  peer.dials[1].openChannel();
  assert.equal(manager.isConnected(), true);
});

test("host accepts only the paired guest during recovery and honors an explicit session end", async (t) => {
  const { manager, peers, events } = fixture();
  t.after(() => manager.destroy());
  await manager.createRoom("AB234");
  const [peer] = peers;
  assert.equal(peer.id, "drop-p2p-ab234");
  peer.signalReady();
  const guest = new TestConnection("original-guest");
  peer.emit("connection", guest);
  guest.openChannel();

  const other = new TestConnection("another-guest");
  peer.emit("connection", other);
  assert.equal(other.dataChannel.readyState, "closed");
  assert.equal(manager.isConnected(), true);

  const rejoin = new TestConnection(guest.peer);
  peer.emit("connection", rejoin);
  assert.equal(guest.dataChannel.readyState, "closed");
  rejoin.openChannel();
  rejoin.emit("data", JSON.stringify({ type: "session-ended" }));
  manager.reconnect();
  assert.equal(manager.isConnected(), false);
  assert.equal(peers.length, 1);
  assert.deepEqual(events, ["waiting", "connected", "lost", "connected", "ended"]);
});

test("leaving while signaling settings are loading cannot reopen a closed Drop", async () => {
  let finishLoading!: (create: () => Peer) => void;
  const unexpectedEvent = () => assert.fail("session already closed");
  const manager = new PeerManager(
    device,
    {
      onPeerOpen: unexpectedEvent,
      onConnectionEstablished: unexpectedEvent,
      onRemoteDevice: unexpectedEvent,
      onConnectionLost: unexpectedEvent,
      onSessionEnded: unexpectedEvent,
      onDataReceived: unexpectedEvent,
      onError: unexpectedEvent,
    },
    () =>
      new Promise((resolve) => {
        finishLoading = resolve;
      }),
  );
  const opening = manager.createRoom("AB234");
  manager.endSession();
  finishLoading(() => assert.fail("session already closed"));
  await opening;
  assert.equal(manager.isConnected(), false);
});
