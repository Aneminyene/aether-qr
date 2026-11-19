import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { processFileForTransfer } from '../utils/fileProcessor';
import { FileTransferData, SenderTransferState } from '../types/protocol';
import { 
  Upload, Play, Pause, SkipForward, SkipBack, 
  RefreshCw, FileText, Lock, SlidersHorizontal
} from 'lucide-react';

interface SenderProps {
  onTransferStateChange?: (state: SenderTransferState) => void;
}

export default function Sender({ onTransferStateChange }: SenderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [transferData, setTransferData] = useState<FileTransferData | null>(null);
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(12);
  const [chunkSize, setChunkSize] = useState<number>(800);
  const [useFountain, setUseFountain] = useState<boolean>(true);
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // File Upload Handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    await processFile(selectedFile, chunkSize, useFountain);
  };

  const processFile = async (f: File, size: number, fountain: boolean) => {
    setIsProcessing(true);
    try {
      const data = await processFileForTransfer(f, size, fountain);
      setTransferData(data);
      setCurrentFrameIndex(0);
      setIsPlaying(true);
    } catch (err) {
      console.error('File compression error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Re-process if settings change
  const handleSettingsChange = async (newChunkSize: number, newFountain: boolean) => {
    setChunkSize(newChunkSize);
    setUseFountain(newFountain);
    if (file) {
      await processFile(file, newChunkSize, newFountain);
    }
  };

  // Screen Wake Lock Handler
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        setWakeLockActive(true);
        wakeLockRef.current.addEventListener('release', () => {
          setWakeLockActive(false);
        });
      }
    } catch (err) {
      console.warn('Wake Lock error:', err instanceof Error ? err.message : String(err));
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
      setWakeLockActive(false);
    }
  };

  useEffect(() => {
    if (isPlaying) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
    return () => releaseWakeLock();
  }, [isPlaying]);

  // Render QR Code onto Canvas whenever currentFrameIndex changes
  useEffect(() => {
    if (!transferData || !canvasRef.current) return;

    const currentChunk = transferData.chunks[currentFrameIndex];
    if (!currentChunk) return;

    QRCode.toCanvas(
      canvasRef.current,
      currentChunk.header,
      {
        width: 300,
        margin: 2,
        color: {
          dark: '#09090b',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
      },
      (err) => {
        if (err) console.error('QR Render Error:', err);
      }
    );
  }, [transferData, currentFrameIndex]);

  // Animation Loop Timer
  useEffect(() => {
    if (!isPlaying || !transferData) return;

    const interval = 1000 / fps;
    timerRef.current = setInterval(() => {
      setCurrentFrameIndex((prev) => (prev + 1) % transferData.chunks.length);
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, fps, transferData]);

  // Notify parent of active transfer
  useEffect(() => {
    onTransferStateChange?.({
      isSending: isPlaying,
      fileName: transferData?.fileName,
      currentFrame: currentFrameIndex,
      totalFrames: transferData?.chunks.length || 0
    });
  }, [isPlaying, currentFrameIndex, transferData, onTransferStateChange]);

  return (
    <div className="flex flex-col gap-6">
      {/* File Drop & Control Header */}
      {!transferData ? (
        <div className="minimal-panel rounded-xl p-10 text-center relative group overflow-hidden border border-dashed border-zinc-800 hover:border-zinc-600 transition-colors cursor-pointer">
          <input
            type="file"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
          />
          
          <div className="relative z-10 flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 group-hover:text-zinc-100 group-hover:border-zinc-700 transition-colors">
              <Upload className="w-5 h-5 stroke-[1.75]" />
            </div>
            
            <div>
              <h3 className="text-base font-semibold text-zinc-100">
                {isProcessing ? 'Processing payload...' : 'Select or drop file to stream'}
              </h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                Any file type up to ~1–2 MB. Payload is compressed with zlib and sliced into optical frames.
              </p>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400 bg-zinc-900 px-3 py-1 rounded-md border border-zinc-800">
              <Lock className="w-3 h-3 text-zinc-500" />
              <span>100% Client-Side · Zero Network Uplink</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* QR Screen Display Panel */}
          <div className="lg:col-span-6 minimal-panel rounded-xl p-6 flex flex-col items-center justify-center relative">
            {/* Top status overlay */}
            <div className="w-full flex items-center justify-between text-xs font-mono text-zinc-400 mb-4 px-1">
              <span className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
                {isPlaying ? 'Streaming frames' : 'Stream paused'}
              </span>
              <span>
                Frame {currentFrameIndex + 1} of {transferData.chunks.length}
              </span>
            </div>

            {/* QR Canvas Container with Clean Minimal Reticles */}
            <div className="p-3 bg-white rounded-lg shadow-sm border border-zinc-200 relative">
              <canvas ref={canvasRef} className="rounded block" />
              <div className="reticle-corner reticle-tl" />
              <div className="reticle-corner reticle-tr" />
              <div className="reticle-corner reticle-bl" />
              <div className="reticle-corner reticle-br" />
            </div>

            {/* Minimal Progress Bar */}
            <div className="w-full mt-6">
              <div className="flex justify-between text-[11px] font-mono text-zinc-400 mb-1.5">
                <span>Sequence Progress</span>
                <span>{Math.round(((currentFrameIndex + 1) / transferData.chunks.length) * 100)}%</span>
              </div>
              <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                <div 
                  className="h-full bg-zinc-100 transition-all duration-100"
                  style={{ width: `${((currentFrameIndex + 1) / transferData.chunks.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center gap-2 mt-6">
              <button
                onClick={() => setCurrentFrameIndex((prev) => (prev - 1 + transferData.chunks.length) % transferData.chunks.length)}
                className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors"
                title="Previous Frame"
              >
                <SkipBack className="w-4 h-4 stroke-[1.75]" />
              </button>

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`px-5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors ${
                  isPlaying 
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700' 
                    : 'bg-zinc-100 hover:bg-white text-zinc-950 font-semibold'
                }`}
              >
                {isPlaying ? <Pause className="w-4 h-4 stroke-[2]" /> : <Play className="w-4 h-4 stroke-[2]" />}
                {isPlaying ? 'Pause Stream' : 'Resume Stream'}
              </button>

              <button
                onClick={() => setCurrentFrameIndex((prev) => (prev + 1) % transferData.chunks.length)}
                className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors"
                title="Next Frame"
              >
                <SkipForward className="w-4 h-4 stroke-[1.75]" />
              </button>
            </div>
          </div>

          {/* Configuration & Stats Panel */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            {/* File Metadata Overview */}
            <div className="minimal-panel rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
                    <FileText className="w-4 h-4 stroke-[1.75]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-zinc-200 truncate max-w-[200px]">{transferData.fileName}</h4>
                    <p className="text-xs text-zinc-400 font-mono">{(transferData.fileSize / 1024).toFixed(1)} KB original</p>
                  </div>
                </div>

                <button
                  onClick={() => setTransferData(null)}
                  className="px-2.5 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-3 h-3 stroke-[1.75]" /> New File
                </button>
              </div>

              {/* Compression Stats Grid */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-zinc-800/80 text-center font-mono">
                <div className="p-2 rounded-lg bg-zinc-900/50 border border-zinc-800/60">
                  <div className="text-[10px] text-zinc-500">COMPRESSED</div>
                  <div className="text-xs font-semibold text-zinc-200 mt-0.5">{(transferData.compressedSize / 1024).toFixed(1)} KB</div>
                </div>
                <div className="p-2 rounded-lg bg-zinc-900/50 border border-zinc-800/60">
                  <div className="text-[10px] text-zinc-500">SAVINGS</div>
                  <div className="text-xs font-semibold text-emerald-400 mt-0.5">{transferData.compressionRatio}%</div>
                </div>
                <div className="p-2 rounded-lg bg-zinc-900/50 border border-zinc-800/60">
                  <div className="text-[10px] text-zinc-500">EST. DURATION</div>
                  <div className="text-xs font-semibold text-zinc-200 mt-0.5">
                    {Math.ceil(transferData.chunks.length / fps)}s
                  </div>
                </div>
              </div>
            </div>

            {/* Transmission Tuning Parameters */}
            <div className="minimal-panel rounded-xl p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400" />
                <span>Transmission Parameters</span>
              </div>

              {/* FPS Slider */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-zinc-400">Stream Rate</span>
                  <span className="text-zinc-200 font-semibold">{fps} FPS</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="30"
                  value={fps}
                  onChange={(e) => setFps(parseInt(e.target.value, 10))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-200"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-0.5">
                  <span>5 FPS (High compatibility)</span>
                  <span>15 FPS (Standard)</span>
                  <span>30 FPS (High speed)</span>
                </div>
              </div>

              {/* Frame Payload Size Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono text-zinc-400">Chunk Density</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[500, 800, 1200, 1600].map((sz) => (
                    <button
                      key={sz}
                      onClick={() => handleSettingsChange(sz, useFountain)}
                      className={`py-1.5 rounded-md text-xs font-mono border transition-colors ${
                        chunkSize === sz
                          ? 'bg-zinc-800 text-zinc-100 border-zinc-600 font-semibold'
                          : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'
                      }`}
                    >
                      {sz} B
                    </button>
                  ))}
                </div>
              </div>

              {/* Fountain Code Mode Toggle */}
              <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80">
                <div>
                  <div className="text-xs font-medium text-zinc-200">Fountain Parity Frames</div>
                  <div className="text-[11px] text-zinc-500">Injects XOR parity chunks for out-of-order drop recovery</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleSettingsChange(chunkSize, !useFountain)}
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors ${
                    useFountain ? 'bg-zinc-200' : 'bg-zinc-800'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full transition-transform ${
                    useFountain ? 'translate-x-5 bg-zinc-950' : 'translate-x-0 bg-zinc-400'
                  }`} />
                </button>
              </div>

              {/* Wake Lock Status Indicator */}
              <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400 bg-zinc-900/80 p-2.5 rounded-lg border border-zinc-800/80">
                <Lock className="w-3.5 h-3.5 text-zinc-500" />
                <span>Screen wake lock: {wakeLockActive ? 'Active' : 'Standby'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
