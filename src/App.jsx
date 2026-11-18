import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Camera, Cpu, FileText, QrCode } from 'lucide-react';
import Sender from './components/Sender';
import Receiver from './components/Receiver';
import SimulationMode from './components/SimulationMode';
import BlueprintDocs from './components/BlueprintDocs';
import Cyber3DVisualizer from './components/Cyber3DVisualizer';
import './index.css';

// ── Tab configuration ───────────────────────────────────────────────────────
const TABS = [
  { id: 'sender',    label: 'Sender',    icon: Upload,   activeMode: 'sender' },
  { id: 'receiver',  label: 'Receiver',  icon: Camera,   activeMode: 'receiver' },
  { id: 'simulate',  label: 'Simulator', icon: Cpu,      activeMode: 'sim' },
  { id: 'blueprint', label: 'Blueprint', icon: FileText, activeMode: 'idle' },
];

// ── App Root ────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState('sender');
  const [senderState, setSenderState] = useState({ isSending: false, currentFrame: 0, totalFrames: 0 });
  const [receiverState, setReceiverState] = useState({ isReceiving: false, isComplete: false });

  const currentTab = TABS.find((t) => t.id === activeTab);
  const isTransferring = senderState.isSending || receiverState.isReceiving;

  return (
    <div className="relative min-h-screen bg-zinc-950 minimal-dot-grid text-zinc-100 overflow-x-hidden selection:bg-zinc-800 selection:text-zinc-100">
      {/* Subtle Ambient Radial Lighting */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-zinc-800/20 blur-[140px] pointer-events-none z-0" />

      {/* Main content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 flex flex-col min-h-screen">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-zinc-900">
            {/* Logo & Title */}
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-200">
                <QrCode className="w-5 h-5 stroke-[1.75]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
                    Aether<span className="text-zinc-500">QR</span>
                  </h1>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                    v1.0
                  </span>
                </div>
                <p className="text-xs text-zinc-400 font-mono tracking-wide mt-0.5">
                  Air-gapped visual data stream protocol
                </p>
              </div>
            </div>

            {/* Status Indicators */}
            <div className="flex items-center gap-2 font-mono text-[11px] flex-wrap">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800/80 text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Air-Gapped
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800/80 text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                Client-Side
              </span>
              <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-colors ${
                isTransferring
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
                  : 'bg-zinc-900 border-zinc-800/80 text-zinc-500'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isTransferring ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
                {isTransferring ? 'Stream Active' : 'Standby'}
              </span>
            </div>
          </div>
        </header>

        {/* ── 3D Visualizer ───────────────────────────────────────────── */}
        <Cyber3DVisualizer
          activeMode={currentTab?.activeMode}
          isTransferring={isTransferring}
          progress={senderState.totalFrames > 0 ? senderState.currentFrame / senderState.totalFrames : 0}
        />

        {/* ── Minimalist Segmented Tab Navigation ─────────────────────────────── */}
        <div className="flex p-1 bg-zinc-900/80 backdrop-blur-md rounded-xl border border-zinc-800/80 gap-1 mb-6">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-2 px-3
                  rounded-lg text-xs font-medium transition-all duration-150
                  ${isActive
                    ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/60 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-transparent'
                  }
                `}
              >
                <Icon className="w-4 h-4 stroke-[1.75]" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Tab Content ─────────────────────────────────────────────────── */}
        <main className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.16 }}
            >
              {activeTab === 'sender'    && <Sender    onTransferStateChange={setSenderState} />}
              {activeTab === 'receiver'  && <Receiver  onTransferStateChange={setReceiverState} />}
              {activeTab === 'simulate'  && <SimulationMode />}
              {activeTab === 'blueprint' && <BlueprintDocs />}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* ── Minimalist Footer ────────────────────────────────────────────── */}
        <footer className="mt-16 pt-6 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-zinc-500">
          <div>
            AETHER-QR · Zero-Connectivity Optical Pipeline
          </div>
          <div className="flex items-center gap-3">
            <span>Client-side only</span>
            <span>·</span>
            <span>No network required</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
