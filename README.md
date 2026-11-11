# Drop

Private browser-to-browser file sharing. Pair two devices with a five-character code or QR link, then send files in either direction without an account or server-side file storage.

## Run locally

Use Node.js 22 or newer.

```bash
npm ci
npm run dev
```

Open http://localhost:3000 in two browser windows. On separate devices, use an HTTPS deployment reachable by both devices; a localhost QR URL is only reachable on the originating computer.

## Transfer behavior

- PeerJS brokers WebRTC connections through its default public signaling service. The retired custom HTTP/WebSocket signaling paths have been removed.
- The host accepts one peer connection at a time; extra connections cannot replace an existing transfer.
- Files are sent sequentially in 64 KB chunks with a 1 MB outgoing-buffer threshold.
- The portable receiver collects chunks in memory, so files are limited to **100 MB each**. SHA-256 verification also allocates an in-memory buffer. This is a conservative bound, not a guarantee for every low-memory browser. Streaming to disk is a future improvement.
- The receiver validates metadata, exact byte and chunk counts, and SHA-256 before acknowledging delivery. Sender progress stays below 100% until that acknowledgement arrives.
- Received files remain available as explicit download links for the session. Delivery confirmation means verified receipt in browser memory, not that the user has saved the file to disk.
- Cancellation stops the queue after the active file; unsent files remain available for another attempt. Failed files can be retried, or removed. Transfers restart from the beginning; partial-file resume is not implemented.
- Stalled buffers and missing acknowledgements time out after 30 seconds. Connection setup also times out after 30 seconds. A lost data connection requires a new session on both devices; signaling reconnection is automatic where the data channel remains intact.
- Blob URLs are revoked when a session ends or the application unmounts.

## Network configuration

Drop includes STUN by default. For restrictive networks, configure a TURN account in your deployment environment (see `.env.example`):

```text
TURN_URLS=turn:your-relay.example:3478,turns:your-relay.example:5349
TURN_USERNAME=your-restricted-turn-user
TURN_CREDENTIAL=your-turn-credential
```

`/api/ice` supplies the settings to participating browsers without caching. TURN credentials must be available to WebRTC clients; use restricted credentials and quotas, or replace this endpoint with your provider's short-lived credential issuance. No TURN service or account is provisioned by this repository.

TURN can relay encrypted file traffic when a direct route is unavailable. Drop does not store the file payload on its application server. The signaling provider and relay may still see connection metadata; this is not an anonymity service. Session codes are bearer access: share only with your intended device and end a session when finished. There is no separate device identity verification or approval prompt.

## Design

The interface uses soft silver surfaces, rounded cards, dark pill buttons and warm red accents across the landing, pairing, and transfer views. Its original device illustration is built with CSS and icons; no third-party reference image or watermark is shipped. Demo state controls are absent from the production app. Reduced motion, keyboard focus and browser zoom are supported.

## Verification

```bash
npm test
npm run build
npm run typecheck
```

The automated protocol tests connect two transfer engines through an ordered in-memory transport. They verify exact bytes, empty files, repeated and reverse transfers, corruption, truncation, missing acknowledgements, stalled buffers, cancellation/retry, channel failures, file size bounds, and cleanup. These tests do not prove live WebRTC connectivity across browsers or networks.

Manual browser checks before release:

1. Pair two windows, send several files and compare the downloaded contents.
2. Send back from the receiving window, then use **Send another file**.
3. Cancel during a transfer and confirm the next queued file does not start.
4. Close a peer mid-transfer and confirm no success message appears; create a fresh session on both devices.
5. Check phone-sized layouts, code paste, QR pairing, keyboard navigation and downloads.
6. Test separate Wi-Fi/mobile networks with a configured TURN relay, including a network that requires relaying.

GitHub Actions runs tests, a production build and TypeScript checks on pull requests.
