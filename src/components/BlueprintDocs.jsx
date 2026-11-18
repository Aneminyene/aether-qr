import React from 'react';
import { 
  FileText, ShieldCheck, Layers, Cpu, CheckCircle2,
  HardDrive, RefreshCw, BarChart2
} from 'lucide-react';

export default function BlueprintDocs() {
  return (
    <div className="flex flex-col gap-8 font-sans">
      {/* Header Banner */}
      <div className="minimal-panel rounded-xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 mb-2">
              <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                Specification v1.0
              </span>
              <span>· Optical Transport Architecture</span>
            </div>
            <h2 className="text-xl md:text-2xl font-semibold text-zinc-100 tracking-tight">
              Zero-Connectivity Optical Data Transfer
            </h2>
            <p className="text-xs md:text-sm text-zinc-400 mt-1 max-w-2xl leading-relaxed">
              Client-side optical transmission pipeline converting arbitrary file bytes into high-speed animated QR code streams, scanned and reconstructed in real-time without Wi-Fi, Bluetooth, or local network access.
            </p>
          </div>
          
          <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300">
            <ShieldCheck className="w-6 h-6 stroke-[1.75]" />
          </div>
        </div>
      </div>

      {/* 4-Phase Data Pipeline Flow */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            step: '01',
            title: 'Compression & ArrayBuffer',
            desc: 'Reads raw file bytes, applies zlib deflate via pako to shrink payload size by up to 70%.',
            icon: HardDrive
          },
          {
            step: '02',
            title: 'Framing & CRC32',
            desc: 'Slices payload into 500–1600 byte chunks with sequential framing headers and CRC32 checksums.',
            icon: Layers
          },
          {
            step: '03',
            title: 'Animated QR Stream',
            desc: 'Renders dynamic QR matrices on HTML5 Canvas at 5–30 FPS with screen wake lock engaged.',
            icon: RefreshCw
          },
          {
            step: '04',
            title: 'Optical Capture & Assemble',
            desc: 'jsQR decodes frames from camera feed, validates checksums, decompresses payload, and saves file.',
            icon: CheckCircle2
          }
        ].map((item, idx) => (
          <div key={idx} className="minimal-panel p-5 rounded-xl flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-lg font-bold font-mono text-zinc-500">{item.step}</span>
                <item.icon className="w-4 h-4 text-zinc-400 stroke-[1.75]" />
              </div>
              <h4 className="text-xs font-semibold text-zinc-200 mb-1">{item.title}</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Architecture Components Grid */}
      <div className="minimal-panel rounded-xl p-6">
        <h3 className="text-sm font-semibold text-zinc-200 mb-4 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-zinc-400 stroke-[1.75]" />
          <span>Core Modules & Engine Architecture</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
          <div className="p-3.5 rounded-lg bg-zinc-900/50 border border-zinc-800">
            <div className="text-zinc-500 text-[10px]">PAYLOAD COMPRESSION</div>
            <div className="text-xs font-semibold text-zinc-200 mt-0.5">pako / zlib</div>
            <div className="text-[11px] text-zinc-400 mt-1 font-sans">In-browser Deflate/Inflate stream compression</div>
          </div>

          <div className="p-3.5 rounded-lg bg-zinc-900/50 border border-zinc-800">
            <div className="text-zinc-500 text-[10px]">QR RENDER ENGINE</div>
            <div className="text-xs font-semibold text-zinc-200 mt-0.5">qrcode (HTML5 Canvas)</div>
            <div className="text-[11px] text-zinc-400 mt-1 font-sans">Dynamic high-density QR matrix rendering at up to 30 FPS</div>
          </div>

          <div className="p-3.5 rounded-lg bg-zinc-900/50 border border-zinc-800">
            <div className="text-zinc-500 text-[10px]">OPTICAL DECODER</div>
            <div className="text-xs font-semibold text-zinc-200 mt-0.5">jsQR Engine</div>
            <div className="text-[11px] text-zinc-400 mt-1 font-sans">Sub-pixel binarization and real-time frame scanning</div>
          </div>

          <div className="p-3.5 rounded-lg bg-zinc-900/50 border border-zinc-800">
            <div className="text-zinc-500 text-[10px]">INTEGRITY VALIDATION</div>
            <div className="text-xs font-semibold text-zinc-200 mt-0.5">CRC32 + Parity XOR</div>
            <div className="text-[11px] text-zinc-400 mt-1 font-sans">Binary frame verification and packet drop recovery</div>
          </div>
        </div>
      </div>

      {/* Speed Benchmark Table */}
      <div className="minimal-panel rounded-xl p-6 overflow-x-auto">
        <h3 className="text-sm font-semibold text-zinc-200 mb-4 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-zinc-400 stroke-[1.75]" />
          <span>Optical Transfer Speed Benchmarks</span>
        </h3>

        <table className="w-full text-left font-mono text-xs border-collapse">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500">
              <th className="pb-3 font-medium">PAYLOAD TYPE</th>
              <th className="pb-3 font-medium">CHUNK DENSITY</th>
              <th className="pb-3 font-medium">TARGET FPS</th>
              <th className="pb-3 font-medium">BANDWIDTH</th>
              <th className="pb-3 font-medium">DURATION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900 text-zinc-300">
            <tr>
              <td className="py-2.5 font-medium text-zinc-200">100 KB Document</td>
              <td className="py-2.5 text-zinc-400">800 Bytes</td>
              <td className="py-2.5 text-zinc-400">15 FPS</td>
              <td className="py-2.5 text-zinc-400">12.0 KB/s</td>
              <td className="py-2.5 text-emerald-400 font-medium">~8.3s</td>
            </tr>
            <tr>
              <td className="py-2.5 font-medium text-zinc-200">500 KB Compressed Image</td>
              <td className="py-2.5 text-zinc-400">1,200 Bytes</td>
              <td className="py-2.5 text-zinc-400">15 FPS</td>
              <td className="py-2.5 text-zinc-400">18.0 KB/s</td>
              <td className="py-2.5 text-emerald-400 font-medium">~27.7s</td>
            </tr>
            <tr>
              <td className="py-2.5 font-medium text-zinc-200">1.0 MB Binary File</td>
              <td className="py-2.5 text-zinc-400">1,600 Bytes</td>
              <td className="py-2.5 text-zinc-400">20 FPS</td>
              <td className="py-2.5 text-zinc-400">32.0 KB/s</td>
              <td className="py-2.5 text-emerald-400 font-medium">~31.2s</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
