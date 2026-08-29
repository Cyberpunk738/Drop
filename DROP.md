# DROP

> **Send files. No account. No upload.**

A fast, minimal peer-to-peer file-sharing web app inspired by AirDrop. Users create a temporary room, share a short room code or QR code, connect another device, and transfer files directly between browsers using WebRTC.

---

## 1. Product Goal

Build the simplest beautiful file-transfer experience possible:

**Open → Create Drop → Connect Device → Drop File → Transfer → Done.**

The server should only help devices discover and connect to each other.

**Files should never be uploaded to or stored on the application server.**

---

# 2. MVP

### Sender Flow

1. User opens Drop.
2. Clicks **Create a Drop**.
3. App generates a short room code.
4. User sees:
   - Room code
   - QR code
   - Waiting-for-device state
5. Receiver joins the room.
6. Devices establish a WebRTC connection.
7. Sender selects or drags files.
8. Transfer begins.
9. Sender sees transfer progress.
10. Receiver downloads the file.

### Receiver Flow

1. User opens Drop.
2. Clicks **Join a Drop**.
3. Enters room code or scans QR code.
4. App connects to the sender.
5. Receiver sees incoming file information.
6. Receiver accepts the transfer.
7. File is received and downloaded.

---

# 3. Core Features

## Room System

- Generate temporary room codes.
- Create a room.
- Join a room.
- Show connection status.
- Handle invalid/expired rooms.
- Allow a sender and receiver to establish a peer connection.

## QR Code

- Generate QR code containing the room/join URL.
- Allow users to scan it from another device.
- Make the QR experience mobile-friendly.

## File Selection

Support:

- File picker
- Drag and drop
- Multiple files

Display:

- Filename
- File type
- File size
- Transfer status
- Transfer progress

## Peer-to-Peer Transfer

Use:

- WebRTC DataChannel

The actual file data must travel directly between connected peers.

The signaling server must NOT receive or store file contents.

## Transfer Progress

Show:

- Percentage
- Progress bar
- Bytes transferred
- Total size
- Transfer speed where practical
- Completed state

## Download

When transfer finishes:

- Reconstruct the file.
- Preserve filename.
- Trigger browser download.

---

# 4. UI / UX Direction

The design should feel like:

**AirDrop + Linear + modern developer tool**

Avoid:

- Generic dashboard layouts
- Excessive cards
- Unnecessary gradients
- Huge amounts of text
- Clutter

Prioritize:

- Large drop zone
- Strong typography
- Clear states
- Smooth transitions
- Minimal interface
- Excellent mobile experience

---

# 5. Main Screens

## Landing Page

Content:

```text
DROP

Send files.
No account. No upload.

[ Create a Drop ]

Join a Drop
```

Include a short explanation:

> Files move directly between your devices.

---

## Create Drop

Show:

```text
Your Drop is ready

7XK9P

[ QR CODE ]

Share this code with your other device.

Waiting for connection...
```

---

## Join Drop

Show:

```text
Join a Drop

Enter room code

[ 7 X K 9 P ]

[ Join Drop ]
```

Also provide QR scanning on supported mobile devices if practical.

---

## Connected / Transfer Screen

Show:

```text
Connected to

Chrome • Mac

────────────────────

Drop your files here

or click to browse

────────────────────

file.zip
128 MB

━━━━━━━━━━━━━━ 67%

85 MB / 128 MB
```

---

## Completed State

Show:

```text
Transfer complete

photo.jpg
12.4 MB

✓ Sent successfully

[ Send another file ]
```

---

# 6. Connection States

The UI should clearly communicate:

- Creating room
- Waiting for device
- Connecting
- Connected
- Disconnected
- Reconnecting
- Transfer pending
- Transferring
- Completed
- Failed
- Room expired

Never leave the user wondering whether something is working.

---

# 7. Technical Architecture

## Frontend

Use:

- Next.js
- TypeScript
- Tailwind CSS
- Framer Motion

Recommended structure:

```text
app/
components/
lib/
hooks/
types/
```

Keep components small and reusable.

---

# 8. Signaling

Use a lightweight WebSocket server.

Its job is ONLY to exchange WebRTC signaling information between peers:

- Room creation
- Room joining
- SDP offers
- SDP answers
- ICE candidates
- Connection/disconnection events

The signaling server must never handle actual file contents.

---

# 9. WebRTC

Use:

```text
RTCPeerConnection
RTCDataChannel
```

Basic flow:

```text
Device A
   │
   │ WebSocket signaling
   ▼
Signaling Server
   │
   │ WebSocket signaling
   ▼
Device B

After connection:

Device A ═══════════════ Device B
          WebRTC
       File Transfer
```

Once the WebRTC connection is established, file data should bypass the server.

---

# 10. File Transfer Strategy

Do NOT send large files as one giant DataChannel message.

Implement chunked transfer.

Example:

```text
File
 │
 ├── Chunk 1
 ├── Chunk 2
 ├── Chunk 3
 ├── Chunk 4
 └── ...
```

Receiver collects the chunks:

```text
Chunks
   ↓
Reassemble
   ↓
Blob
   ↓
Download
```

Start with a reasonable chunk size and test browser compatibility.

Use backpressure / `bufferedAmount` where necessary so the sender does not overwhelm the DataChannel.

---

# 11. Initial Development Target

Do NOT start by solving every possible WebRTC edge case.

First milestone:

```text
Browser A
   ↓
Create room
   ↓
Browser B
   ↓
Join room
   ↓
WebRTC connection
   ↓
Send hello.txt
   ↓
Browser B downloads hello.txt
```

Once this works, expand the transfer system.

---

# 12. Security / Privacy

The product promise is:

> Files are transferred directly between connected devices.

Do not:

- Store files on the server.
- Upload files to cloud storage.
- Store transferred file contents in a database.
- Log file contents.

Room codes should be temporary.

Rooms should expire after inactivity.

Use HTTPS/WSS in production.

WebRTC provides encrypted transport between peers.

---

# 13. Error Handling

Handle at minimum:

### Invalid room

```text
This Drop doesn't exist.
```

### Expired room

```text
This Drop has expired.
Create a new one.
```

### Connection failure

```text
Couldn't connect.

[ Try again ]
```

### Transfer failure

```text
Transfer failed.

[ Retry ]
```

### Device disconnect

```text
Device disconnected.

Waiting for reconnection...
```

---

# 14. Performance Requirements

The app should feel instant.

Prioritize:

- Minimal JavaScript where possible.
- Fast initial page load.
- No unnecessary dependencies.
- Efficient file chunking.
- No server-side file processing.
- No unnecessary database.

Do not optimize prematurely.

Measure actual problems before adding complexity.

---

# 15. MVP Constraints

The first version should support:

- Two devices.
- One active transfer at a time.
- Temporary rooms.
- Multiple files.
- Reasonably large files.
- Modern desktop browsers.
- Modern mobile browsers.

Do not build multi-user rooms in MVP.

---

# 16. Explicitly NOT Building

Do NOT implement these during MVP:

- User accounts
- Authentication
- Profiles
- Cloud storage
- File history
- Permanent rooms
- Payments
- Subscriptions
- Chat
- Social features
- Comments
- Admin dashboard
- Analytics dashboard
- File previews for every possible format
- Native mobile apps
- Browser extensions
- Team/workspace functionality

If a feature isn't necessary for:

**Create → Connect → Transfer → Download**

it probably doesn't belong in MVP.

---

# 17. Development Milestones

## Milestone 1 — UI

Build:

- Landing page
- Create Drop screen
- Join Drop screen
- Transfer screen
- Empty states
- Loading states
- Error states
- Responsive/mobile layout

No real WebRTC yet.

---

## Milestone 2 — Signaling

Implement:

- WebSocket server
- Room creation
- Room joining
- Room expiration
- SDP exchange
- ICE candidate exchange

Test using two browser windows/devices.

---

## Milestone 3 — WebRTC

Implement:

- RTCPeerConnection
- DataChannel
- Connection state handling

Success criteria:

```text
Device A ↔ Device B

WebRTC connection: CONNECTED
```

---

## Milestone 4 — Basic File Transfer

Start with:

```text
hello.txt
```

Then:

```text
image.jpg
```

Then larger files.

---

## Milestone 5 — Chunking

Implement:

- File chunking
- Chunk ordering
- Reassembly
- DataChannel backpressure
- Transfer progress

---

## Milestone 6 — UX Polish

Add:

- QR codes
- Drag & drop
- Transfer animations
- Speed indicator
- Better errors
- Connection states
- Mobile polish
- Empty states

---

## Milestone 7 — Production Testing

Test:

- Chrome → Chrome
- Chrome → Safari
- Desktop → Mobile
- Mobile → Desktop
- Different networks
- Large files
- Disconnect/reconnect
- Multiple files
- Slow connections

---

# 18. Definition of Done

Drop MVP is complete when a user can:

```text
1. Open Drop
        ↓
2. Create a room
        ↓
3. Scan QR / enter room code
        ↓
4. Connect another device
        ↓
5. Drag a file
        ↓
6. Transfer it directly via WebRTC
        ↓
7. See transfer progress
        ↓
8. Download the file
```

with no account and no file upload to the server.

---

# 19. Engineering Principles

### Keep it simple.

Prefer:

```text
simple + reliable
```

over:

```text
complex + clever
```

### Don't over-engineer.

If a feature isn't required for the MVP, leave it out.

### Build vertically.

Do not spend days building perfect UI before testing WebRTC.

Get this working early:

```text
Room → Connect → Send File → Download
```

Then make it beautiful.

### Test with real devices.

Two browser tabs are useful, but eventually test:

```text
Laptop → Phone
Phone → Laptop
Laptop → Laptop
```

---

# 20. Suggested Repository Structure

```text
drop/
│
├── app/
│   ├── page.tsx
│   ├── create/
│   ├── join/
│   └── drop/
│
├── components/
│   ├── DropZone.tsx
│   ├── RoomCode.tsx
│   ├── QRCode.tsx
│   ├── ConnectionStatus.tsx
│   ├── FileItem.tsx
│   └── TransferProgress.tsx
│
├── hooks/
│   ├── useWebRTC.ts
│   └── useRoom.ts
│
├── lib/
│   ├── signaling.ts
│   ├── webrtc.ts
│   └── file-transfer.ts
│
├── types/
│   └── index.ts
│
└── signaling-server/
    └── server.ts
```

Adjust the structure if the chosen implementation requires it. Do not create unnecessary abstractions.

---

# 21. First Build Task

Start with **Milestone 1 only**.

Build the complete responsive UI using mocked connection/transfer states.

Do not implement WebRTC yet.

The UI should already feel like a polished product before networking is added.

After the UI is complete, move to signaling and WebRTC.

---

## Product North Star

Drop should feel like:

> **“I don't need to think about file sharing. I just drop the file.”**