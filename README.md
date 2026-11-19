# Aether-QR

> **Air-Gapped Optical Data Transfer Stream**  
> High-throughput, zero-connectivity visual file transmission architecture over animated QR code streams.

---

## Overview

**Aether-QR** is a pure client-side web application and Progressive Web App (PWA) designed to transmit arbitrary files across physically isolated air-gaps without Wi-Fi, Bluetooth, cellular data, cables, or local networks.

Files are compressed in-browser, sliced into sequential packets with integrity checksums and optional XOR parity frames, and streamed as high-density animated QR codes onto an HTML5 Canvas. A receiving device captures the optical stream using its camera, decodes frames in real-time with sub-pixel precision, verifies payload integrity via CRC32, and reconstructs the original file.

---

## Core Capabilities

- **Strict Air-Gap Isolation**: Requires zero network connection, zero server endpoints, and zero wireless radios.
- **Client-Side Processing**: Operates entirely within the browser sandbox using JavaScript typed arrays (`ArrayBuffer`, `Uint8Array`).
- **Deflate Compression**: Utilizes `pako` (zlib) to reduce binary payloads by up to 70% before chunking, drastically minimizing total frame count.
- **Tunable Optical Throughput**:
  - **Frame Rate**: Configurable from 5 FPS up to 30 FPS.
  - **Payload Density**: Selectable chunk sizes (500 B, 800 B, 1,200 B, 1,600 B).
- **Fountain Parity & Fault Tolerance**: Optional XOR parity frame emission to recover dropped or skipped visual frames without stalling.
- **Real-Time Frame Matrix**: Visual tracking grid detailing captured, pending, and reconstructed packets.
- **CRC32 Checksum Validation**: Byte-for-byte validation ensures reconstructed payloads match original files before trigger saving.
- **Screen Wake Lock API**: Prevents the transmitter display from dimming or sleeping mid-transfer.
- **Integrated Dual-Node Simulator**: Built-in test sandbox that streams and receives simultaneously on a single machine for throughput benchmarking.
- **Optical Stream Telemetry**: Subtle Three.js wireframe visualizer displaying transmission activity and system readiness.
- **Minimalist Aesthetic**: Clean monochrome interface with dark mode palette, crisp borders, and Lucide vector iconography.

---

## System Architecture

```
[ Sender Device ]                                    [ Receiver Device ]
+----------------------+                             +----------------------+
| 1. File Selection    |                             | 5. Camera Feed       |
|    (ArrayBuffer)     |                             |    (jsQR Optical)    |
+----------+-----------+                             +----------+-----------+
           |                                                    |
           v                                                    v
+----------------------+                             +----------------------+
| 2. zlib Compression  |                             | 6. Frame Matrix &    |
|    (pako Deflate)    |                             |    Deduplication     |
+----------+-----------+                             +----------+-----------+
           |                                                    |
           v                                                    v
+----------------------+                             +----------------------+
| 3. Packet Chunking   |                             | 7. XOR Parity &      |
|    & CRC32 Framing   |                             |    CRC32 Checksum    |
+----------+-----------+                             +----------+-----------+
           |                                                    |
           v                                                    v
+----------------------+       Optical Air-Gap       +----------------------+
| 4. Animated QR       | ==========================> | 8. In-Browser File   |
|    Canvas Stream     |       (Light / Camera)      |    Reconstruction    |
+----------------------+                             +----------------------+
```

### 1. Ingestion & Compression
The sender reads file bytes into an `ArrayBuffer` and compresses the raw data using `pako.deflate`. The resulting compressed stream is assigned a CRC32 checksum.

### 2. Framing & Headers
The compressed stream is sliced into chunks of chosen byte density (e.g., 800 bytes). Each chunk is prefixed with metadata:
- Transfer identifier
- Frame sequence index (`i`)
- Total frames (`n`)
- Original file name and MIME type
- Frame payload checksum

### 3. Visual Emission
The sender cycles through encoded QR frames at the selected frame rate (e.g., 12–15 FPS) rendered directly onto an HTML5 Canvas.

### 4. Camera Decoding & Assembly
The receiver accesses the device video camera, draws frames onto an offscreen canvas at screen refresh rates, decodes QR barcodes with `jsQR`, and stores unique frame indices into a tracking set. Once all chunks are acquired, `pako.inflate` reconstructs the original file for download.

---

## Transfer Performance Benchmarks

| Payload Type | File Size (Compressed) | Chunk Density | Target FPS | Bandwidth | Transfer Time |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Plain Text / Code** | ~100 KB | 800 Bytes | 15 FPS | ~12.0 KB/s | ~8.3 seconds |
| **Compressed Image** | ~500 KB | 1,200 Bytes | 15 FPS | ~18.0 KB/s | ~27.7 seconds |
| **Binary Payload** | ~1.0 MB | 1,600 Bytes | 20 FPS | ~32.0 KB/s | ~31.2 seconds |

*Actual speeds vary based on camera shutter speed, screen refresh rate, display brightness, and ambient lighting.*

---

## Tech Stack

- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 + Minimalist Zinc Dark Theme
- **Type Definitions**: Strict TypeScript (`tsconfig.json`)
- **QR Encoding**: `qrcode`
- **QR Decoding**: `jsQR`
- **Compression**: `pako` (zlib Deflate / Inflate)
- **Telemetry Visualizer**: Three.js
- **Animations**: Framer Motion
- **PWA Support**: `vite-plugin-pwa`

---

## Getting Started

### Prerequisites

- Node.js 18+
- Modern browser with camera support (Chrome, Edge, Safari, Firefox)
- HTTPS connection (required by browsers for camera and Wake Lock API access in production)

### Installation

```bash
# Clone repository
git clone https://github.com/Aneminyene/aether-qr.git
cd aether-qr

# Install dependencies
npm install

# Start local development server
npm run dev
```

### Production Build

```bash
npm run build
npm run preview
```

---

## Usage Guide

### Sender Workflow
1. Navigate to the **Sender** tab.
2. Drag and drop or browse for a file to transmit.
3. Configure the stream speed (FPS) and chunk payload size if needed.
4. Position the transmitter screen facing the receiving device's camera.
5. Click **Resume Stream** or let auto-play cycle the frames.

### Receiver Workflow
1. Navigate to the **Receiver** tab on the destination device.
2. Grant camera permissions when prompted.
3. Align the camera viewfinder with the sender screen.
4. Watch the real-time frame matrix populate as frames are recognized.
5. Upon 100% capture and CRC32 verification, click **Download File**.

### Simulator Workflow
1. Navigate to the **Simulator** tab.
2. Click **Generate Sample Payload**.
3. Observe simultaneous sender transmission and receiver acquisition within a single unified loop.

---

## Security Model

Aether-QR relies strictly on visual line-of-sight optical transport:
- **Zero RF Emissions**: Wi-Fi, Bluetooth, NFC, and Cellular interfaces can remain disabled.
- **Ephemeral Processing**: No data is uploaded to remote servers or stored in persistent cloud databases.
- **Integrity Verified**: CRC32 parity guarantees protection against silent visual frame corruption.

---

## License

MIT License. Designed and built for secure air-gapped optical workflows.
