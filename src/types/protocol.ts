export interface ChunkItem {
  index: number | string;
  header: string;
  size: number;
  isXor?: boolean;
}

export interface FileTransferData {
  transferId: string;
  fileName: string;
  fileSize: number;
  compressedSize: number;
  compressionRatio: string;
  fileType: string;
  fileChecksum: string;
  totalChunks: number;
  chunkSize: number;
  chunks: ChunkItem[];
}

export interface ReconstructedFile {
  fileName: string;
  fileType: string;
  fileSize: number;
  blob: Blob;
  downloadUrl: string;
  isChecksumValid: boolean;
  computedChecksum: string;
  expectedChecksum: string;
  transferTimeMs: number;
  averageSpeedKbps: string;
}

export interface ParseFrameResult {
  transferId: string;
  totalChunks: number;
  receivedCount: number;
  progressPercent: number;
  lastReceivedIndex: number | null;
  isComplete: boolean;
  elapsedMs: number;
}

export interface ScanStats {
  totalChunks: number;
  receivedCount: number;
  progressPercent: number;
  lastReceivedIndex: number | null;
  isComplete: boolean;
  fileName: string | null;
}

export interface SenderTransferState {
  isSending: boolean;
  fileName?: string;
  currentFrame: number;
  totalFrames: number;
}

export interface ReceiverTransferState {
  isReceiving: boolean;
  receivedCount?: number;
  totalChunks?: number;
  isComplete: boolean;
}
