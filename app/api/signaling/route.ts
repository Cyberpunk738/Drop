import { NextResponse } from "next/server";

interface SignalingMessagePayload {
  id: number;
  type: string;
  payload: any;
  timestamp: number;
}

interface ServerlessRoom {
  code: string;
  hostInfo?: any;
  guestInfo?: any;
  createdAt: number;
  lastActive: number;
  hostMessages: SignalingMessagePayload[];
  guestMessages: SignalingMessagePayload[];
}

// Global serverless store for active rooms
// Note: In Node.js serverless runtime, memory persists across concurrent requests within execution container
const rooms = new Map<string, ServerlessRoom>();
const ROOM_TTL_MS = 15 * 60 * 1000; // 15 minutes

function generateCode(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Cleanup stale rooms
function cleanupStaleRooms() {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (now - room.createdAt > ROOM_TTL_MS) {
      rooms.delete(code);
    }
  }
}

export async function POST(req: Request) {
  cleanupStaleRooms();

  try {
    const body = await req.json();
    const { action, roomCode, role, peerInfo, message, lastIndex = 0 } = body;
    const now = Date.now();

    switch (action) {
      case "create": {
        let code = generateCode();
        while (rooms.has(code)) {
          code = generateCode();
        }

        const newRoom: ServerlessRoom = {
          code,
          hostInfo: peerInfo,
          createdAt: now,
          lastActive: now,
          hostMessages: [],
          guestMessages: [],
        };

        rooms.set(code, newRoom);
        return NextResponse.json({
          status: "ok",
          roomCode: code,
        });
      }

      case "join": {
        const code = (roomCode || "").toUpperCase().trim();
        const room = rooms.get(code);

        if (!room) {
          return NextResponse.json(
            { status: "error", message: "This Drop doesn't exist or has expired." },
            { status: 404 }
          );
        }

        if (now - room.createdAt > ROOM_TTL_MS) {
          rooms.delete(code);
          return NextResponse.json(
            { status: "error", message: "This Drop has expired." },
            { status: 410 }
          );
        }

        room.guestInfo = peerInfo;
        room.lastActive = now;

        // Push 'peer-joined' to host messages queue
        room.hostMessages.push({
          id: room.hostMessages.length + 1,
          type: "peer-joined",
          payload: { peerInfo },
          timestamp: now,
        });

        return NextResponse.json({
          status: "ok",
          roomCode: code,
          hostInfo: room.hostInfo,
        });
      }

      case "send": {
        const code = (roomCode || "").toUpperCase().trim();
        const room = rooms.get(code);

        if (!room) {
          return NextResponse.json({ status: "error", message: "Room not found" }, { status: 404 });
        }

        room.lastActive = now;
        const msgPayload: SignalingMessagePayload = {
          id: 0,
          type: message.type,
          payload: message,
          timestamp: now,
        };

        // If host is sending, push to guest queue; if guest is sending, push to host queue
        if (role === "host") {
          msgPayload.id = room.guestMessages.length + 1;
          room.guestMessages.push(msgPayload);
        } else {
          msgPayload.id = room.hostMessages.length + 1;
          room.hostMessages.push(msgPayload);
        }

        return NextResponse.json({ status: "ok" });
      }

      case "poll": {
        const code = (roomCode || "").toUpperCase().trim();
        const room = rooms.get(code);

        if (!room) {
          return NextResponse.json({ status: "error", message: "Room expired or closed" }, { status: 404 });
        }

        room.lastActive = now;
        const queue = role === "host" ? room.hostMessages : room.guestMessages;
        const newMessages = queue.filter((m) => m.id > lastIndex);

        return NextResponse.json({
          status: "ok",
          messages: newMessages,
          lastIndex: queue.length,
          guestJoined: !!room.guestInfo,
        });
      }

      case "leave": {
        const code = (roomCode || "").toUpperCase().trim();
        const room = rooms.get(code);
        if (room) {
          if (role === "host") {
            room.guestMessages.push({
              id: room.guestMessages.length + 1,
              type: "peer-left",
              payload: { reason: "Host closed the session." },
              timestamp: now,
            });
            rooms.delete(code);
          } else {
            room.hostMessages.push({
              id: room.hostMessages.length + 1,
              type: "peer-left",
              payload: { reason: "Guest disconnected." },
              timestamp: now,
            });
            room.guestInfo = undefined;
          }
        }
        return NextResponse.json({ status: "ok" });
      }

      default:
        return NextResponse.json({ status: "error", message: "Unknown action" }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ status: "error", message: err.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "DROP Serverless Signaling API",
    activeRooms: rooms.size,
    timestamp: new Date().toISOString(),
  });
}
