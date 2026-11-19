import { inflate } from 'pako';
import { base64ToUint8, crc32 } from './fileProcessor';
import { ParseFrameResult, ReconstructedFile } from '../types/protocol';

export class FileReconstructor {
  transferId: string | null = null;
  fileName: string | null = null;
  fileType: string | null = null;
  fileChecksum: string | null = null;
  totalChunks: number = 0;
  receivedChunks: Map<number, string> = new Map();
  lastReceivedIndex: number | null = null;
  startTime: number | null = null;
  endTime: number | null = null;
  isComplete: boolean = false;
  receivedBytes: number = 0;

  constructor() {
    this.reset();
  }

  reset(): void {
    this.transferId = null;
    this.fileName = null;
    this.fileType = null;
    this.fileChecksum = null;
    this.totalChunks = 0;
    this.receivedChunks = new Map();
    this.lastReceivedIndex = null;
    this.startTime = null;
    this.endTime = null;
    this.isComplete = false;
    this.receivedBytes = 0;
  }

  /**
   * Parse incoming raw QR frame string
   */
  parseFrame(rawFrame: string): ParseFrameResult | null {
    if (!rawFrame || typeof rawFrame !== 'string') return null;

    const parts = rawFrame.split('|');
    const isXor = parts[0] === 'AETH_XOR';
    
    if (parts[0] !== 'AETH' && !isXor) {
      return null; // Invalid framing protocol
    }

    if (parts.length < 9) return null;

    const [, , transferId, totalChunksStr, indexStr, fileChecksum, nameEnc, typeEnc, payload] = parts;
    const totalChunks = parseInt(totalChunksStr, 10);
    const fileName = decodeURIComponent(nameEnc);
    const fileType = decodeURIComponent(typeEnc);

    // If new transfer ID detected, reset buffer
    if (this.transferId && this.transferId !== transferId && !this.isComplete) {
      this.reset();
    }

    if (!this.startTime) {
      this.startTime = Date.now();
    }

    this.transferId = transferId;
    this.totalChunks = totalChunks;
    this.fileName = fileName;
    this.fileType = fileType;
    this.fileChecksum = fileChecksum;

    if (!isXor) {
      const chunkIndex = parseInt(indexStr, 10);
      if (!this.receivedChunks.has(chunkIndex)) {
        this.receivedChunks.set(chunkIndex, payload);
        this.receivedBytes += payload.length;
        this.lastReceivedIndex = chunkIndex;
      }
    } else {
      // Handle XOR Fountain Chunk recovery if standard missing
      const [idxAStr, idxBStr] = indexStr.split('_');
      const idxA = parseInt(idxAStr, 10);
      const idxB = parseInt(idxBStr, 10);

      const hasA = this.receivedChunks.has(idxA);
      const hasB = this.receivedChunks.has(idxB);

      if (hasA && !hasB) {
        // Recover B from A and XOR
        try {
          const chunkA = this.receivedChunks.get(idxA)!;
          const xorPayload = atob(payload);
          let recoveredB = '';
          for (let i = 0; i < Math.min(chunkA.length, xorPayload.length); i++) {
            recoveredB += String.fromCharCode(chunkA.charCodeAt(i) ^ xorPayload.charCodeAt(i));
          }
          this.receivedChunks.set(idxB, recoveredB);
          this.lastReceivedIndex = idxB;
        } catch (e) {
          console.warn('Fountain recovery failed for B', e);
        }
      } else if (!hasA && hasB) {
        // Recover A from B and XOR
        try {
          const chunkB = this.receivedChunks.get(idxB)!;
          const xorPayload = atob(payload);
          let recoveredA = '';
          for (let i = 0; i < Math.min(chunkB.length, xorPayload.length); i++) {
            recoveredA += String.fromCharCode(chunkB.charCodeAt(i) ^ xorPayload.charCodeAt(i));
          }
          this.receivedChunks.set(idxA, recoveredA);
          this.lastReceivedIndex = idxA;
        } catch (e) {
          console.warn('Fountain recovery failed for A', e);
        }
      }
    }

    // Check if transfer is 100% complete
    if (this.receivedChunks.size === this.totalChunks && !this.isComplete) {
      this.endTime = Date.now();
      this.isComplete = true;
    }

    return {
      transferId: this.transferId,
      totalChunks: this.totalChunks,
      receivedCount: this.receivedChunks.size,
      progressPercent: Math.round((this.receivedChunks.size / this.totalChunks) * 100),
      lastReceivedIndex: this.lastReceivedIndex,
      isComplete: this.isComplete,
      elapsedMs: (this.endTime || Date.now()) - (this.startTime || Date.now())
    };
  }

  /**
   * Reconstruct original file blob when complete
   */
  assembleFile(): ReconstructedFile {
    if (!this.isComplete || this.receivedChunks.size < this.totalChunks) {
      throw new Error(`Incomplete payload: received ${this.receivedChunks.size}/${this.totalChunks} chunks`);
    }

    // Concatenate chunk payloads in order
    let fullBase64 = '';
    for (let i = 0; i < this.totalChunks; i++) {
      const chunkPayload = this.receivedChunks.get(i);
      if (!chunkPayload) {
        throw new Error(`Missing chunk index: ${i}`);
      }
      fullBase64 += chunkPayload;
    }

    // Decode base64 compressed bytes
    const compressedBytes = base64ToUint8(fullBase64);

    // Decompress using pako zlib inflate
    const decompressedBytes = inflate(compressedBytes);

    // Verify uncompressed data checksum
    let binaryStr = '';
    for (let i = 0; i < decompressedBytes.length; i++) {
      binaryStr += String.fromCharCode(decompressedBytes[i]);
    }
    const computedChecksum = crc32(btoa(binaryStr));

    const isChecksumValid = (computedChecksum.toLowerCase() === (this.fileChecksum || '').toLowerCase());

    const blob = new Blob([decompressedBytes as unknown as BlobPart], { type: this.fileType || 'application/octet-stream' });
    const downloadUrl = URL.createObjectURL(blob);
    const duration = (this.endTime || Date.now()) - (this.startTime || Date.now());

    return {
      fileName: this.fileName || 'transferred_file',
      fileType: this.fileType || 'application/octet-stream',
      fileSize: decompressedBytes.length,
      blob,
      downloadUrl,
      isChecksumValid,
      computedChecksum,
      expectedChecksum: this.fileChecksum || '',
      transferTimeMs: duration,
      averageSpeedKbps: duration > 0 ? ((decompressedBytes.length / 1024) / (duration / 1000)).toFixed(1) : '0.0'
    };
  }

  getMissingIndices(): number[] {
    const missing: number[] = [];
    for (let i = 0; i < this.totalChunks; i++) {
      if (!this.receivedChunks.has(i)) {
        missing.push(i);
      }
    }
    return missing;
  }
}
