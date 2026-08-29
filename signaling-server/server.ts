import http from "http";
import { WebSocketServer, WebSocket } from "ws";

interface PeerInfo {
  browser: string;
  os: string;
  deviceType: string;
  deviceName: string;
}

interface Room {
  code: string;
  hostWs: WebSocket;
  guestWs?: WebSocket;
  hostInfo?: PeerInfo;
  guestInfo?: PeerInfo;
  createdAt: number;
  lastActive: number;
}

const PORT = parseInt(process.env.SIGNALING_PORT || "3001", 10);
const ROOM_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL

// Generate clean 5-character room code without ambiguous characters (0/O, 1/I)
function generateRoomCode(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

const rooms = new Map<string, Room>();
const clientToRoom = new Map<WebSocket, string>();

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === "/health" || req.url === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        service: "DROP Signaling Server",
        activeRooms: rooms.size,
        timestamp: new Date().toISOString(),
      })
    );
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not Found");
});

const wss = new WebSocketServer({ server });

function send(ws: WebSocket, data: object) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

wss.on("connection", (ws: WebSocket) => {
  ws.on("message", (rawMessage: string) => {
    try {
      const msg = JSON.parse(rawMessage.toString());
      const now = Date.now();

      switch (msg.type) {
        case "create-room": {
          let code = generateRoomCode();
          while (rooms.has(code)) {
            code = generateRoomCode();
          }

          const room: Room = {
            code,
            hostWs: ws,
            hostInfo: msg.peerInfo,
            createdAt: now,
            lastActive: now,
          };

          rooms.set(code, room);
          clientToRoom.set(ws, code);

          send(ws, {
            type: "room-created",
            roomCode: code,
          });
          console.log(`[Signaling] Room created: ${code}`);
          break;
        }

        case "join-room": {
          const code = (msg.roomCode || "").toUpperCase().trim();
          const room = rooms.get(code);

          if (!room) {
            send(ws, {
              type: "error",
              message: "This Drop doesn't exist or has expired.",
            });
            return;
          }

          if (room.guestWs && room.guestWs.readyState === WebSocket.OPEN) {
            send(ws, {
              type: "error",
              message: "This Drop room is already full (2 devices max).",
            });
            return;
          }

          if (now - room.createdAt > ROOM_TTL_MS) {
            rooms.delete(code);
            send(ws, {
              type: "error",
              message: "This Drop has expired. Please create a new one.",
            });
            return;
          }

          room.guestWs = ws;
          room.guestInfo = msg.peerInfo;
          room.lastActive = now;
          clientToRoom.set(ws, code);

          // Inform guest they joined
          send(ws, {
            type: "room-joined",
            roomCode: code,
            role: "receiver",
            peerInfo: room.hostInfo,
          });

          // Inform host that peer joined
          send(room.hostWs, {
            type: "peer-joined",
            peerInfo: room.guestInfo,
          });

          console.log(`[Signaling] Peer joined room: ${code}`);
          break;
        }

        case "offer": {
          const code = msg.roomCode || clientToRoom.get(ws);
          if (!code) return;
          const room = rooms.get(code);
          if (room && room.guestWs && room.hostWs === ws) {
            room.lastActive = now;
            send(room.guestWs, {
              type: "offer",
              sdp: msg.sdp,
            });
          }
          break;
        }

        case "answer": {
          const code = msg.roomCode || clientToRoom.get(ws);
          if (!code) return;
          const room = rooms.get(code);
          if (room && room.hostWs && room.guestWs === ws) {
            room.lastActive = now;
            send(room.hostWs, {
              type: "answer",
              sdp: msg.sdp,
            });
          }
          break;
        }

        case "ice-candidate": {
          const code = msg.roomCode || clientToRoom.get(ws);
          if (!code) return;
          const room = rooms.get(code);
          if (!room) return;

          room.lastActive = now;
          if (ws === room.hostWs && room.guestWs) {
            send(room.guestWs, {
              type: "ice-candidate",
              candidate: msg.candidate,
            });
          } else if (ws === room.guestWs && room.hostWs) {
            send(room.hostWs, {
              type: "ice-candidate",
              candidate: msg.candidate,
            });
          }
          break;
        }

        case "leave-room": {
          handleDisconnect(ws);
          break;
        }
      }
    } catch (err) {
      console.error("[Signaling] Error parsing message:", err);
    }
  });

  ws.on("close", () => {
    handleDisconnect(ws);
  });

  ws.on("error", (err) => {
    console.error("[Signaling] WS error:", err);
    handleDisconnect(ws);
  });
});

function handleDisconnect(ws: WebSocket) {
  const code = clientToRoom.get(ws);
  if (!code) return;

  clientToRoom.delete(ws);
  const room = rooms.get(code);
  if (!room) return;

  if (ws === room.hostWs) {
    if (room.guestWs && room.guestWs.readyState === WebSocket.OPEN) {
      send(room.guestWs, {
        type: "peer-left",
        reason: "The host left or disconnected.",
      });
    }
    rooms.delete(code);
    console.log(`[Signaling] Host left room ${code}, room deleted.`);
  } else if (ws === room.guestWs) {
    if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
      send(room.hostWs, {
        type: "peer-left",
        reason: "The connected device left.",
      });
    }
    room.guestWs = undefined;
    room.guestInfo = undefined;
    console.log(`[Signaling] Guest left room ${code}.`);
  }
}

// Periodic cleanup of expired rooms
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (now - room.createdAt > ROOM_TTL_MS) {
      if (room.hostWs.readyState === WebSocket.OPEN) {
        send(room.hostWs, { type: "error", message: "Room expired." });
      }
      if (room.guestWs && room.guestWs.readyState === WebSocket.OPEN) {
        send(room.guestWs, { type: "error", message: "Room expired." });
      }
      rooms.delete(code);
      console.log(`[Signaling] Cleaned up expired room: ${code}`);
    }
  }
}, 60 * 1000);

server.listen(PORT, () => {
  console.log(`🚀 DROP Signaling Server running on http://localhost:${PORT} and ws://localhost:${PORT}`);
});
