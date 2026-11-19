import { deflate } from 'pako';
import { FileTransferData, ChunkItem } from '../types/protocol';

/**
 * Calculates CRC32 checksum for data integrity verification
 */
export function crc32(str: string): string {
  let crc = -1;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    crc ^= code;
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return ((crc ^ -1) >>> 0).toString(16).padStart(8, '0');
}

/**
 * Encodes Uint8Array to Base64
 */
function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decodes Base64 to Uint8Array
 */
export function base64ToUint8(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Processes an input File into compressed chunks ready for animated QR transmission
 */
export async function processFileForTransfer(
  file: File,
  chunkSize: number = 800,
  useFountain: boolean = false
): Promise<FileTransferData> {
  const arrayBuffer = await file.arrayBuffer();
  const rawBytes = new Uint8Array(arrayBuffer);
  
  // Compress using pako zlib deflate
  const compressedBytes = deflate(rawBytes, { level: 9 });
  const base64Data = uint8ToBase64(compressedBytes);
  
  // Calculate checksum of the original uncompressed file
  const uncompressedBase64 = uint8ToBase64(rawBytes);
  const fileChecksum = crc32(uncompressedBase64);
  const transferId = Math.random().toString(36).substring(2, 10).toUpperCase();

  const totalChunks = Math.ceil(base64Data.length / chunkSize);
  const chunks: ChunkItem[] = [];

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, base64Data.length);
    const chunkPayload = base64Data.substring(start, end);
    
    // Header Format: AETH|v1|transferId|totalChunks|chunkIndex|fileChecksum|fileName|mimeType|payload
    const header = [
      'AETH',
      'v1',
      transferId,
      totalChunks,
      i,
      fileChecksum,
      encodeURIComponent(file.name),
      encodeURIComponent(file.type || 'application/octet-stream'),
      chunkPayload
    ].join('|');

    chunks.push({
      index: i,
      header: header,
      size: header.length
    });
  }

  // Generate Fountain XOR Parity Chunks if requested
  const fountainChunks: ChunkItem[] = [];
  if (useFountain && totalChunks > 1) {
    const fountainCount = Math.ceil(totalChunks * 0.5);
    for (let f = 0; f < fountainCount; f++) {
      const idxA = f % totalChunks;
      const idxB = (f + 1) % totalChunks;
      const chunkA = chunks[idxA].header.split('|')[8];
      const chunkB = chunks[idxB].header.split('|')[8];
      
      // XOR combination
      const minLen = Math.min(chunkA.length, chunkB.length);
      let xorPayload = '';
      for (let k = 0; k < minLen; k++) {
        xorPayload += String.fromCharCode(chunkA.charCodeAt(k) ^ chunkB.charCodeAt(k));
      }
      const xorBase64 = btoa(xorPayload);
      
      const fHeader = [
        'AETH_XOR',
        'v1',
        transferId,
        totalChunks,
        `${idxA}_${idxB}`,
        fileChecksum,
        encodeURIComponent(file.name),
        encodeURIComponent(file.type || 'application/octet-stream'),
        xorBase64
      ].join('|');

      fountainChunks.push({
        index: `XOR_${idxA}_${idxB}`,
        header: fHeader,
        isXor: true,
        size: fHeader.length
      });
    }
  }

  return {
    transferId,
    fileName: file.name,
    fileSize: file.size,
    compressedSize: compressedBytes.length,
    compressionRatio: ((1 - compressedBytes.length / file.size) * 100).toFixed(1),
    fileType: file.type,
    fileChecksum,
    totalChunks,
    chunkSize,
    chunks: [...chunks, ...fountainChunks]
  };
}
