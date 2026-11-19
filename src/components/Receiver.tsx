import { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import { FileReconstructor } from '../utils/fileReconstructor';
import { audioFx } from '../utils/audioEffects';
import { ReconstructedFile, ScanStats, ReceiverTransferState } from '../types/protocol';
import { 
  Camera, CameraOff, CheckCircle2, Download, Volume2, VolumeX,
  RefreshCw, AlertCircle, FileCheck, Layers, SwitchCamera
} from 'lucide-react';

interface ReceiverProps {
  onTransferStateChange?: (state: ReceiverTransferState) => void;
}

interface PreviewContent {
  type: 'image' | 'text';
  url?: string;
  text?: string;
}

export default function Receiver({ onTransferStateChange }: ReceiverProps) {
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [reconstructor] = useState<FileReconstructor>(() => new FileReconstructor());

  const [scanStats, setScanStats] = useState<ScanStats>({
    totalChunks: 0,
    receivedCount: 0,
    progressPercent: 0,
    lastReceivedIndex: null,
    isComplete: false,
    fileName: null
  });

  const [completedFile, setCompletedFile] = useState<ReconstructedFile | null>(null);
  const [previewContent, setPreviewContent] = useState<PreviewContent | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Toggle Sound FX
  const toggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    audioFx.enabled = nextState;
  };

  // Start Camera Stream
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
      } catch (primaryErr) {
        console.warn('Primary camera constraints failed, attempting fallback...', primaryErr);
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsScanning(true);
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError('Unable to access camera. Please verify permissions and HTTPS connection.');
      setIsScanning(false);
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  // Switch Front/Back Camera
  const toggleCameraFacing = () => {
    const newFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newFacing);
    if (isScanning) {
      stopCamera();
      setTimeout(startCamera, 300);
    }
  };

  // Frame Scanning Loop using jsQR
  useEffect(() => {
    if (!isScanning) return;

    const scanFrame = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          // Decode QR Code
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth'
          });

          if (code && code.data) {
            const result = reconstructor.parseFrame(code.data);
            if (result) {
              setScanStats({
                totalChunks: result.totalChunks,
                receivedCount: result.receivedCount,
                progressPercent: result.progressPercent,
                lastReceivedIndex: result.lastReceivedIndex,
                isComplete: result.isComplete,
                fileName: reconstructor.fileName
              });

              audioFx.playChunkBeep(result.progressPercent / 100);

              // Handle completion
              if (result.isComplete && !completedFile) {
                const assembled = reconstructor.assembleFile();
                setCompletedFile(assembled);
                audioFx.playSuccessFanfare();
                confetti({
                  particleCount: 80,
                  spread: 60,
                  origin: { y: 0.6 }
                });

                // Generate preview if text or image
                if (assembled.fileType.startsWith('image/')) {
                  setPreviewContent({ type: 'image', url: assembled.downloadUrl });
                } else if (assembled.fileType.startsWith('text/') || assembled.fileType.includes('json') || assembled.fileType.includes('javascript')) {
                  assembled.blob.text().then((txt) => {
                    setPreviewContent({ type: 'text', text: txt.substring(0, 2000) });
                  });
                }

                stopCamera();
                return;
              }
            }
          }
        }
      }

      animFrameIdRef.current = requestAnimationFrame(scanFrame);
    };

    animFrameIdRef.current = requestAnimationFrame(scanFrame);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [isScanning, reconstructor, completedFile]);

  // Reset Scanner State
  const handleReset = () => {
    reconstructor.reset();
    setCompletedFile(null);
    setPreviewContent(null);
    setScanStats({
      totalChunks: 0,
      receivedCount: 0,
      progressPercent: 0,
      lastReceivedIndex: null,
      isComplete: false,
      fileName: null
    });
    startCamera();
  };

  // Notify Parent
  useEffect(() => {
    onTransferStateChange?.({
      isReceiving: isScanning,
      receivedCount: scanStats.receivedCount,
      totalChunks: scanStats.totalChunks,
      isComplete: scanStats.isComplete
    });
  }, [isScanning, scanStats, onTransferStateChange]);

  return (
    <div className="flex flex-col gap-6">
      {/* Top Controls Header */}
      <div className="flex items-center justify-between minimal-panel p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
            <Camera className="w-4 h-4 stroke-[1.75]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Optical Receiver</h3>
            <p className="text-xs text-zinc-400 font-mono">
              {isScanning ? 'Decoding live QR video feed' : 'Camera on standby'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleSound}
            className={`p-2 rounded-lg border transition-colors ${
              soundEnabled 
                ? 'bg-zinc-800 text-zinc-200 border-zinc-700' 
                : 'bg-zinc-900 text-zinc-500 border-zinc-800'
            }`}
            title="Toggle Sound Effects"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 stroke-[1.75]" /> : <VolumeX className="w-3.5 h-3.5 stroke-[1.75]" />}
          </button>

          <button
            onClick={toggleCameraFacing}
            className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors"
            title="Switch Camera Facing"
          >
            <SwitchCamera className="w-3.5 h-3.5 stroke-[1.75]" />
          </button>

          {!isScanning && !completedFile ? (
            <button
              onClick={startCamera}
              className="px-4 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs flex items-center gap-1.5 transition-colors"
            >
              <Camera className="w-3.5 h-3.5 stroke-[2]" />
              <span>Start Camera</span>
            </button>
          ) : (
            <button
              onClick={stopCamera}
              className="px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-mono flex items-center gap-1.5 transition-colors"
            >
              <CameraOff className="w-3.5 h-3.5 stroke-[1.75]" />
              <span>Stop</span>
            </button>
          )}
        </div>
      </div>

      {cameraError && (
        <div className="p-3.5 rounded-lg bg-red-950/40 border border-red-900/60 text-red-300 text-xs font-mono flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span>{cameraError}</span>
        </div>
      )}

      {/* Main Scanner & Progress Layout */}
      {!completedFile ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Camera Viewfinder Box */}
          <div className="lg:col-span-6 minimal-panel rounded-xl p-4 relative overflow-hidden flex flex-col items-center justify-center min-h-[300px]">
            <div className="relative w-full rounded-lg overflow-hidden bg-black/40 border border-zinc-800/80">
              <video
                ref={videoRef}
                playsInline
                muted
                className={`w-full h-auto rounded-lg object-cover ${isScanning ? 'block' : 'hidden'}`}
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Minimal Corner Reticles */}
              {isScanning && (
                <>
                  <div className="reticle-corner reticle-tl" />
                  <div className="reticle-corner reticle-tr" />
                  <div className="reticle-corner reticle-bl" />
                  <div className="reticle-corner reticle-br" />
                </>
              )}
            </div>

            {!isScanning && (
              <div className="flex flex-col items-center text-center p-8 gap-3">
                <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                  <Camera className="w-5 h-5 stroke-[1.75]" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-zinc-200">Point Camera at Sender</h4>
                  <p className="text-xs text-zinc-400 mt-1 max-w-xs">
                    Align the QR code stream in camera view to begin decoding.
                  </p>
                </div>
                <button
                  onClick={startCamera}
                  className="px-4 py-2 mt-1 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs transition-colors"
                >
                  Activate Camera
                </button>
              </div>
            )}
          </div>

          {/* Real-time Chunk Matrix & Stats */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <div className="minimal-panel rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                  <Layers className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Frame Capture Matrix</span>
                </div>
                <span className="text-[11px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                  {scanStats.receivedCount} / {scanStats.totalChunks || 0} Frames
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden border border-zinc-800 mb-4">
                <div
                  className="h-full bg-zinc-100 transition-all duration-100"
                  style={{ width: `${scanStats.progressPercent}%` }}
                />
              </div>

              {/* Dynamic Matrix Grid Visualizer */}
              {scanStats.totalChunks > 0 ? (
                <div className="grid grid-cols-8 sm:grid-cols-10 gap-1.5 max-h-48 overflow-y-auto p-2 rounded-lg bg-zinc-950 border border-zinc-800/80">
                  {Array.from({ length: scanStats.totalChunks }).map((_, idx) => {
                    const isReceived = reconstructor.receivedChunks.has(idx);
                    const isLatest = scanStats.lastReceivedIndex === idx;

                    return (
                      <div
                        key={idx}
                        className={`h-6 rounded flex items-center justify-center text-[10px] font-mono transition-colors ${
                          isLatest
                            ? 'bg-zinc-100 text-zinc-950 font-bold'
                            : isReceived
                            ? 'bg-zinc-800 text-zinc-200 border border-zinc-700/60'
                            : 'bg-zinc-900/60 text-zinc-600 border border-zinc-800/40'
                        }`}
                        title={`Frame #${idx + 1}: ${isReceived ? 'Captured' : 'Pending'}`}
                      >
                        {idx + 1}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-32 flex flex-col items-center justify-center text-xs font-mono text-zinc-500 border border-dashed border-zinc-800 rounded-lg">
                  <span>Awaiting optical stream...</span>
                </div>
              )}
            </div>

            {/* Transfer Metrics Diagnostics */}
            {scanStats.totalChunks > 0 && (
              <div className="minimal-panel rounded-xl p-3.5 text-xs font-mono flex items-center justify-between text-zinc-400">
                <span>File: {scanStats.fileName || reconstructor.transferId || 'Detecting...'}</span>
                <span className="text-zinc-200 font-semibold">{scanStats.progressPercent}% complete</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Completed File Viewer & Download Component */
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="minimal-panel rounded-xl p-8 flex flex-col items-center text-center gap-6"
        >
          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-6 h-6 stroke-[1.75]" />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-zinc-100">
              File Reconstructed & Verified
            </h3>
            <p className="text-xs text-zinc-400 font-mono mt-1 flex items-center justify-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Decompressed and validated via CRC32 checksum</span>
            </p>
          </div>

          {/* Transfer Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full max-w-lg font-mono text-center">
            <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800">
              <div className="text-[10px] text-zinc-500">FILE NAME</div>
              <div className="text-xs font-medium text-zinc-200 truncate mt-0.5">{completedFile.fileName}</div>
            </div>
            <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800">
              <div className="text-[10px] text-zinc-500">PAYLOAD SIZE</div>
              <div className="text-xs font-semibold text-zinc-200 mt-0.5">{(completedFile.fileSize / 1024).toFixed(1)} KB</div>
            </div>
            <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800">
              <div className="text-[10px] text-zinc-500">DURATION</div>
              <div className="text-xs font-semibold text-zinc-200 mt-0.5">{(completedFile.transferTimeMs / 1000).toFixed(1)}s</div>
            </div>
            <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800">
              <div className="text-[10px] text-zinc-500">THROUGHPUT</div>
              <div className="text-xs font-semibold text-zinc-200 mt-0.5">{completedFile.averageSpeedKbps} KB/s</div>
            </div>
          </div>

          {/* Checksum Pill */}
          <div className="text-[11px] font-mono px-3 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400">
            CRC32: {completedFile.expectedChecksum} [{completedFile.isChecksumValid ? 'Verified' : 'Mismatch'}]
          </div>

          {/* Image / Text Preview Box */}
          {previewContent && (
            <div className="w-full max-w-lg p-3 rounded-lg bg-zinc-950 border border-zinc-800 overflow-hidden max-h-60">
              {previewContent.type === 'image' && (
                <img src={previewContent.url} alt="Preview" className="max-h-52 mx-auto rounded object-contain" />
              )}
              {previewContent.type === 'text' && (
                <pre className="text-xs font-mono text-zinc-300 text-left overflow-auto max-h-44 p-2.5 bg-black/50 rounded">
                  {previewContent.text}
                </pre>
              )}
            </div>
          )}

          {/* Download & New Transfer Actions */}
          <div className="flex items-center gap-3">
            <a
              href={completedFile.downloadUrl}
              download={completedFile.fileName}
              className="px-5 py-2.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs flex items-center gap-2 transition-colors"
            >
              <Download className="w-3.5 h-3.5 stroke-[2]" /> Download File
            </a>

            <button
              onClick={handleReset}
              className="px-4 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-mono text-xs flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 stroke-[1.75]" /> Scan Another
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
