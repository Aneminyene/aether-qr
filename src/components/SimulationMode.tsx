import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { processFileForTransfer } from '../utils/fileProcessor';
import { FileReconstructor } from '../utils/fileReconstructor';
import { audioFx } from '../utils/audioEffects';
import { FileTransferData, ReconstructedFile, ScanStats } from '../types/protocol';
import { 
  Play, Pause, CheckCircle2, Download, 
  Cpu, Sparkles
} from 'lucide-react';

export default function SimulationMode() {
  const [, setTestFile] = useState<File | null>(null);
  const [senderData, setSenderData] = useState<FileTransferData | null>(null);
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(15);
  const [reconstructor] = useState<FileReconstructor>(() => new FileReconstructor());

  const [simStats, setSimStats] = useState<ScanStats>({
    totalChunks: 0,
    receivedCount: 0,
    progressPercent: 0,
    lastReceivedIndex: null,
    isComplete: false,
    fileName: null
  });

  const [completedFile, setCompletedFile] = useState<ReconstructedFile | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Generate Sample Demo File
  const handleGenerateSampleFile = async () => {
    const sampleText = `AETHER AIR-GAPPED OPTICAL FILE TRANSFER TEST PAYLOAD
---------------------------------------------------
Timestamp: ${new Date().toISOString()}
Protocol: Visual Data Stream over Animated QR Codes
Encryption Checksum: CRC32 Validated
Compression: pako Deflate / Inflate Engine

Aether-QR transmits files across physical isolation air-gaps by slicing compressed binary streams into sequential QR frames displayed at high frame rates and decoded in real-time via camera optics.

[END OF AIR-GAP TEST FILE]`;

    const blob = new Blob([sampleText], { type: 'text/plain' });
    const file = new File([blob], 'airgap_test_blueprint.txt', { type: 'text/plain' });
    setTestFile(file);
    await initTransfer(file);
  };

  // Process selected custom or sample file
  const initTransfer = async (file: File) => {
    reconstructor.reset();
    setCompletedFile(null);
    setSimStats({
      totalChunks: 0,
      receivedCount: 0,
      progressPercent: 0,
      lastReceivedIndex: null,
      isComplete: false,
      fileName: null
    });

    const data = await processFileForTransfer(file, 600, true);
    setSenderData(data);
    setCurrentFrameIndex(0);
    setIsPlaying(true);
  };

  // Render QR Code onto Canvas
  useEffect(() => {
    if (!senderData || !canvasRef.current) return;

    const chunk = senderData.chunks[currentFrameIndex];
    if (!chunk) return;

    QRCode.toCanvas(
      canvasRef.current,
      chunk.header,
      {
        width: 260,
        margin: 2,
        color: { dark: '#09090b', light: '#ffffff' }
      },
      (err) => {
        if (err) console.error(err);
      }
    );

    // Simulate Receiver reading this exact frame via optical link
    if (isPlaying && !completedFile) {
      const res = reconstructor.parseFrame(chunk.header);
      if (res) {
        setSimStats({
          totalChunks: res.totalChunks,
          receivedCount: res.receivedCount,
          progressPercent: res.progressPercent,
          lastReceivedIndex: res.lastReceivedIndex,
          isComplete: res.isComplete,
          fileName: reconstructor.fileName
        });

        audioFx.playChunkBeep(res.progressPercent / 100);

        if (res.isComplete) {
          const assembled = reconstructor.assembleFile();
          setCompletedFile(assembled);
          setIsPlaying(false);
          audioFx.playSuccessFanfare();
          confetti({ particleCount: 70, spread: 50 });
        }
      }
    }
  }, [senderData, currentFrameIndex, isPlaying, reconstructor, completedFile]);

  // Loop Timer
  useEffect(() => {
    if (!isPlaying || !senderData || completedFile) return;

    const interval = 1000 / fps;
    const timer = setInterval(() => {
      setCurrentFrameIndex((prev) => (prev + 1) % senderData.chunks.length);
    }, interval);

    return () => clearInterval(timer);
  }, [isPlaying, fps, senderData, completedFile]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header Banner */}
      <div className="minimal-panel rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
            <Cpu className="w-4 h-4 stroke-[1.75]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">
              Dual-Node Optical Loop Simulator
            </h3>
            <p className="text-xs text-zinc-400 font-mono">
              Simulates visual sender transmission and camera decoding in one continuous test loop
            </p>
          </div>
        </div>

        <button
          onClick={handleGenerateSampleFile}
          className="px-4 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs flex items-center gap-2 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 stroke-[2]" /> Generate Sample Payload
        </button>
      </div>

      {senderData && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sender Window */}
          <div className="lg:col-span-6 minimal-panel rounded-xl p-5 flex flex-col items-center justify-center">
            <div className="w-full flex justify-between text-xs font-mono text-zinc-400 mb-3 px-1">
              <span>Transmitter Node</span>
              <span>Frame {currentFrameIndex + 1} of {senderData.chunks.length}</span>
            </div>

            <div className="p-2.5 bg-white rounded-lg border border-zinc-200 shadow-sm relative">
              <canvas ref={canvasRef} className="rounded block" />
              <div className="reticle-corner reticle-tl" />
              <div className="reticle-corner reticle-tr" />
              <div className="reticle-corner reticle-bl" />
              <div className="reticle-corner reticle-br" />
            </div>

            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  isPlaying 
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700' 
                    : 'bg-zinc-100 hover:bg-white text-zinc-950 font-semibold'
                }`}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 stroke-[2]" /> : <Play className="w-3.5 h-3.5 stroke-[2]" />}
                {isPlaying ? 'Pause' : 'Resume'}
              </button>

              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                <span>Speed:</span>
                <input
                  type="range"
                  min="5"
                  max="30"
                  value={fps}
                  onChange={(e) => setFps(parseInt(e.target.value, 10))}
                  className="w-20 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-200"
                />
                <span className="text-zinc-200 font-medium">{fps} FPS</span>
              </div>
            </div>
          </div>

          {/* Receiver Window */}
          <div className="lg:col-span-6 minimal-panel rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex justify-between text-xs font-mono text-zinc-400 mb-3 px-1">
                <span>Receiver Node</span>
                <span className="text-zinc-200 font-semibold">{simStats.progressPercent}% captured</span>
              </div>

              <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden border border-zinc-800 mb-4">
                <div
                  className="h-full bg-zinc-100 transition-all duration-100"
                  style={{ width: `${simStats.progressPercent}%` }}
                />
              </div>

              {/* Grid Matrix */}
              <div className="grid grid-cols-8 gap-1.5 p-2 rounded-lg bg-zinc-950 border border-zinc-800/80 max-h-36 overflow-y-auto">
                {Array.from({ length: senderData.chunks.length }).map((_, idx) => {
                  const captured = reconstructor.receivedChunks.has(idx);
                  return (
                    <div
                      key={idx}
                      className={`h-5 rounded flex items-center justify-center text-[9px] font-mono transition-colors ${
                        captured 
                          ? 'bg-zinc-800 text-zinc-200 border border-zinc-700/60' 
                          : 'bg-zinc-900/60 text-zinc-600 border border-zinc-800/40'
                      }`}
                    >
                      {idx + 1}
                    </div>
                  );
                })}
              </div>
            </div>

            {completedFile ? (
              <div className="mt-4 p-4 rounded-lg bg-zinc-900/90 border border-zinc-800 text-center flex flex-col items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <div className="text-xs font-semibold text-zinc-100">Simulated transfer finished & verified</div>
                <a
                  href={completedFile.downloadUrl}
                  download={completedFile.fileName}
                  className="px-4 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold flex items-center gap-1.5 transition-colors mt-1"
                >
                  <Download className="w-3 h-3 stroke-[2]" /> Download Reconstructed File
                </a>
              </div>
            ) : (
              <div className="text-xs font-mono text-zinc-500 mt-4 text-center">
                Looping optical stream at {fps} frames/sec
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
