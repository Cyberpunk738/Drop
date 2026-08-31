# DROP — Peer-to-Peer File Sharing

> **Send files. No account. No upload.**

DROP is a fast, minimal, peer-to-peer file-sharing web application inspired by the **14islands Monochrome Editorial Gallery** aesthetic and modern developer tools. It enables instant file transfers directly between browsers using **WebRTC DataChannels** and a lightweight **WebSocket Signaling Server**, guaranteeing zero server-side file storage and complete privacy.

---

## ✨ Features

- **Direct P2P Transfer**: File data travels directly between connected browsers via WebRTC DataChannels—bypassing intermediate servers entirely.
- **Zero Server Storage**: No databases, no cloud buckets, and zero file caching.
- **Instant Rooms & QR Codes**: Generate temporary 5-character room codes or scan SVG QR codes with your device's camera.
- **Chunked Streaming & Backpressure**: High-performance 64KB chunking with adaptive buffer thresholding (`bufferedAmount`) for transferring large files smoothly without browser memory leaks.
- **14islands Editorial Gallery Aesthetic**: Clean white canvas, oversized `Newsreader` display typography, hairline borders, and strict 4px corner radii with zero chromatic color noise.
- **Live Transfer Metrics**: Real-time progress bars, byte counters, speed indicators (MB/s), and estimated time remaining (ETA).
- **Tactile Audio Feedback**: Subtle Web Audio API synthesis for clicks, connection confirmation, and completion chimes.
- **UI State Previewer**: Integrated dev toolbar to preview all connection and transfer states.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling & Motion**: Tailwind CSS, Framer Motion, Lucide Icons
- **Signaling**: Node.js WebSocket Server (`ws`)
- **P2P Engine**: WebRTC (`RTCPeerConnection`, `RTCDataChannel`)
- **Typography**: Newsreader (Editorial Serif), Inter (Grotesque UI), JetBrains Mono
- **Utilities**: `qrcode.react`

---

## 📐 How It Works

```text
1. Discovery & Signaling
   Device A (Sender) ──[ WebSocket ]──> Signaling Server <──[ WebSocket ]── Device B (Receiver)
                                   (Exchanges SDP & ICE)

2. Direct P2P Transfer (Zero Server Interaction)
   Device A ══════════════════ WebRTC DataChannel ══════════════════> Device B
   (64KB Chunks)                                                    (Reassemble Blob & Download)
```

1. **Host** creates a drop room (`create-room`), receiving a 5-character code (e.g. `7XK9P`) and QR code.
2. **Guest** enters the code or scans the QR code (`join-room`).
3. The lightweight signaling server relays the SDP Offer, Answer, and ICE Candidates.
4. Once the `RTCDataChannel` opens, file chunks stream directly from peer to peer.
5. The receiving browser reassembles the binary chunks into a `Blob` and triggers automatic download.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18.0.0 or later recommended)
- `npm` or `yarn` / `pnpm`

### Installation

```bash
# Clone the repository
git clone https://github.com/Cyberpunk738/Drop.git
cd Drop

# Install dependencies
npm install
```

### Running Locally

To run both the **Next.js Frontend** and the **Signaling Server** simultaneously:

```bash
npm run dev:all
```

Or run each service individually in separate terminals:

```bash
# Terminal 1: Signaling Server (Port 3001)
npm run signaling

# Terminal 2: Next.js Frontend (Port 3000)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing the Connection

### Option A: Two Browser Windows (Same Computer)
1. Open **[http://localhost:3000](http://localhost:3000)** in Window 1 and click **`Create a Drop`**.
2. Open an **Incognito / Private Window** in Window 2 and go to **[http://localhost:3000](http://localhost:3000)**.
3. Click **`Join a Drop`** and enter the 5-letter code displayed in Window 1.
4. Drag a file into Window 1 and click **`Send Files Now`** — Window 2 will receive and automatically download the file.

### Option B: Between Phone & Computer (Same Wi-Fi)
1. On your computer, open **[http://localhost:3000](http://localhost:3000)** and click **`Create a Drop`**.
2. On your mobile phone, open the Camera and **scan the QR code** on the computer screen.
3. Tap the link to open DROP in your mobile browser. Once paired, you can stream photos or files directly to your computer!

---

## 📁 Project Structure

```text
DROP/
├── app/
│   ├── globals.css         # Theme tokens, typography, and hairline utilities
│   ├── layout.tsx          # Root layout with Newsreader, Inter & Mono fonts
│   └── page.tsx            # Main application coordinator
├── components/
│   ├── CreateDropView.tsx  # Room code & QR code display
│   ├── DemoStateSwitcher.tsx # Interactive UI state preview toolbar
│   ├── DropZone.tsx        # Drag-and-drop file target & browse CTA
│   ├── JoinDropView.tsx    # 5-box code entry & join triggers
│   ├── Navbar.tsx          # Device badges & connection status
│   ├── QRCodeCard.tsx      # SVG QR code rendering & link copy
│   ├── QRScannerModal.tsx  # Camera QR code scanner
│   ├── TransferProgress.tsx # File queue & live metrics
│   └── TransferView.tsx    # Connected & completed screens
├── hooks/
│   └── useRoom.ts          # State management hook for WebRTC & signaling
├── lib/
│   ├── audio.ts            # Web Audio API micro-sounds
│   ├── device.ts           # Browser/OS detection & formatting utils
│   ├── file-transfer.ts    # 64KB chunk streaming & reassembly engine
│   ├── signaling.ts        # WebSocket signaling client
│   └── webrtc.ts           # RTCPeerConnection & DataChannel manager
├── signaling-server/
│   └── server.ts           # Standalone WebSocket signaling server
├── types/
│   └── index.ts            # TypeScript interfaces & types
├── DESIGN (2).md           # 14islands style reference & tokens
└── DROP.md                 # Product specifications & roadmap
```

---

## 🔒 Security & Privacy

- **End-to-End Encrypted Transport**: All WebRTC DataChannels are encrypted by default using DTLS/SCTP.
- **Zero Server Knowledge**: The signaling server only handles temporary connection metadata and room coordination—it never receives file payloads.
- **Ephemeral Rooms**: Room codes automatically expire after 15 minutes of inactivity.

---

## 📄 License

MIT License. Feel free to use and adapt this project.
