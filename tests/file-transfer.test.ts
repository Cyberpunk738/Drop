import test from "node:test";
import assert from "node:assert/strict";
import {
  FileTransferEngine,
  CHUNK_SIZE,
  MAX_FILE_SIZE,
} from "../lib/file-transfer";
import type { FileItem } from "../types";
const noop = () => {};
function item(bytes: Uint8Array, name = "payload.bin"): FileItem {
  const file = new File([new Uint8Array(bytes).buffer], name);
  return {
    id: crypto.randomUUID(),
    name,
    size: file.size,
    type: "application/octet-stream",
    file,
    progress: 0,
    status: "pending",
  };
}
function pair(
  transform: (data: string | ArrayBuffer) => string | ArrayBuffer | null = (
    d,
  ) => d,
  acknowledge = true,
) {
  const sender = new FileTransferEngine(100),
    receiver = new FileTransferEngine(100);
  const received: { item: FileItem; blob: Blob }[] = [],
    errors: string[] = [];
  const reply = (data: string | ArrayBuffer) => {
    if (acknowledge)
      void sender.handleIncomingData(
        data,
        noop,
        noop,
        noop,
        errors.push.bind(errors),
      );
    return true;
  };
  const send = (data: string | ArrayBuffer) => {
    const transformed = transform(data);
    if (transformed !== null)
      void receiver.handleIncomingData(
        transformed,
        noop,
        noop,
        (item, blob) => received.push({ item, blob }),
        errors.push.bind(errors),
        reply,
      );
    return true;
  };
  return {
    sender,
    receiver,
    send,
    received,
    errors,
    reset: () => {
      sender.reset();
      receiver.reset();
    },
  };
}
test("multi-chunk transfer verifies exact received bytes before sender success", async () => {
  const data = new Uint8Array(CHUNK_SIZE * 3 + 19).map((_, i) => i % 251);
  const p = pair();
  let completed = false;
  assert.equal(
    await p.sender.sendFile(
      item(data),
      p.send,
      () => 0,
      noop,
      () => {
        assert.equal(p.received.length, 1);
        completed = true;
      },
      (_, e) => assert.fail(e),
    ),
    true,
  );
  assert.equal(completed, true);
  assert.deepEqual(
    new Uint8Array(await p.received[0].blob.arrayBuffer()),
    data,
  );
  p.reset();
});
test("zero-byte files and consecutive transfers work in both directions", async () => {
  const a = new FileTransferEngine(100),
    b = new FileTransferEngine(100);
  const received: Blob[] = [];
  const intoA = (d: string | ArrayBuffer): boolean => {
    void a.handleIncomingData(
      d,
      noop,
      noop,
      (_, blob) => received.push(blob),
      assert.fail,
      intoB,
    );
    return true;
  };
  const intoB = (d: string | ArrayBuffer): boolean => {
    void b.handleIncomingData(
      d,
      noop,
      noop,
      (_, blob) => received.push(blob),
      assert.fail,
      intoA,
    );
    return true;
  };
  for (const [engine, send, bytes] of [
    [a, intoB, new Uint8Array(0)],
    [a, intoB, new Uint8Array([1, 2])],
    [b, intoA, new Uint8Array([3, 4, 5])],
  ] as const) {
    assert.equal(
      await engine.sendFile(
        item(bytes),
        send,
        () => 0,
        noop,
        noop,
        (_, e) => assert.fail(e),
      ),
      true,
    );
  }
  assert.deepEqual(
    await Promise.all(
      received.map(async (b) =>
        Array.from(new Uint8Array(await b.arrayBuffer())),
      ),
    ),
    [[], [1, 2], [3, 4, 5]],
  );
  a.reset();
  b.reset();
});
test("corrupted bytes never produce success or a download", async () => {
  const p = pair((d) => {
    if (d instanceof ArrayBuffer) {
      const copy = new Uint8Array(d.slice(0));
      copy[0] ^= 1;
      return copy.buffer;
    }
    return d;
  });
  let completed = false,
    failure = "";
  assert.equal(
    await p.sender.sendFile(
      item(new Uint8Array([1, 2, 3])),
      p.send,
      () => 0,
      noop,
      () => {
        completed = true;
      },
      (_, e) => {
        failure = e;
      },
    ),
    false,
  );
  assert.match(failure, /integrity/);
  assert.equal(completed, false);
  assert.equal(p.received.length, 0);
  p.reset();
});
test("truncated files are rejected instead of marked completed", async () => {
  const p = pair((d) => (d instanceof ArrayBuffer ? null : d));
  let failure = "";
  assert.equal(
    await p.sender.sendFile(
      item(new Uint8Array([1, 2, 3])),
      p.send,
      () => 0,
      noop,
      assert.fail,
      (_, e) => {
        failure = e;
      },
    ),
    false,
  );
  assert.match(failure, /Incomplete/);
  assert.equal(p.received.length, 0);
  p.reset();
});
test("missing receiver acknowledgement times out", async () => {
  const p = pair((d) => d, false);
  let failure = "";
  assert.equal(
    await p.sender.sendFile(
      item(new Uint8Array([1])),
      p.send,
      () => 0,
      noop,
      assert.fail,
      (_, e) => {
        failure = e;
      },
    ),
    false,
  );
  assert.match(failure, /did not confirm/);
  p.reset();
});
test("cancellation interrupts a blocked buffer and a later retry succeeds", async () => {
  const p = pair();
  let failure = "";
  const sending = p.sender.sendFile(
    item(new Uint8Array(CHUNK_SIZE)),
    p.send,
    () => Infinity,
    noop,
    assert.fail,
    (_, e) => {
      failure = e;
    },
  );
  setTimeout(() => p.sender.cancelTransfer(), 25);
  assert.equal(await sending, false);
  assert.match(failure, /cancelled/);
  assert.equal(
    await p.sender.sendFile(
      item(new Uint8Array([9])),
      p.send,
      () => 0,
      noop,
      noop,
      (_, e) => assert.fail(e),
    ),
    true,
  );
  p.reset();
});
test("stalled buffers time out", async () => {
  const p = pair();
  let failure = "";
  assert.equal(
    await p.sender.sendFile(
      item(new Uint8Array([1])),
      p.send,
      () => Infinity,
      noop,
      assert.fail,
      (_, e) => {
        failure = e;
      },
    ),
    false,
  );
  assert.match(failure, /stalled/);
  p.reset();
});
test("channel failures do not report successful delivery", async () => {
  const p = pair();
  let count = 0,
    failure = "";
  assert.equal(
    await p.sender.sendFile(
      item(new Uint8Array([1])),
      (d) => (++count === 1 ? p.send(d) : false),
      () => 0,
      noop,
      assert.fail,
      (_, e) => {
        failure = e;
      },
    ),
    false,
  );
  assert.match(failure, /disconnected/);
  p.reset();
});
test("oversized files are rejected without reading or sending payloads", async () => {
  const p = pair();
  const f = item(new Uint8Array(0));
  f.file = { size: MAX_FILE_SIZE + 1 } as File;
  let failure = "";
  assert.equal(
    await p.sender.sendFile(
      f,
      () => assert.fail("must not send"),
      () => 0,
      noop,
      assert.fail,
      (_, e) => {
        failure = e;
      },
    ),
    false,
  );
  assert.match(failure, /100 MB/);
  p.reset();
});
test("reset rejects pending acknowledgement and revokes downloaded Blob URLs", async () => {
  const p = pair((d) => d, false);
  let failure = "";
  const sending = p.sender.sendFile(
    item(new Uint8Array([1])),
    p.send,
    () => 0,
    noop,
    assert.fail,
    (_, e) => {
      failure = e;
    },
  );
  await new Promise((r) => setTimeout(r, 20));
  const url = p.received[0].item.blobUrl!;
  assert.equal((await fetch(url)).status, 200);
  p.reset();
  assert.equal(await sending, false);
  assert.match(failure, /cancelled/);
  await assert.rejects(fetch(url));
});

test("receiver cancellation rejects sender completion", async () => {
  const a = new FileTransferEngine(100),
    b = new FileTransferEngine(100);
  const reply = (d: string | ArrayBuffer) => {
    void a.handleIncomingData(d, noop, noop, noop, noop);
    return true;
  };
  const send = (d: string | ArrayBuffer) => {
    void b.handleIncomingData(
      d,
      noop,
      () => b.cancelTransfer(),
      () => assert.fail("cancelled receiver must not complete"),
      noop,
      reply,
    );
    return true;
  };
  let failure = "";
  assert.equal(
    await a.sendFile(
      item(new Uint8Array([1, 2, 3])),
      send,
      () => 0,
      noop,
      assert.fail,
      (_, e) => {
        failure = e;
      },
    ),
    false,
  );
  assert.match(failure, /Receiver cancelled/);
  a.reset();
  b.reset();
});
