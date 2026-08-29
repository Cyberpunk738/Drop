"use client";

import React, { useState } from "react";
import { ConnectionState } from "@/types";
import { Sparkles, ChevronUp, ChevronDown, Radio, Play } from "lucide-react";
import { sounds } from "@/lib/audio";

interface DemoStateSwitcherProps {
  currentState: ConnectionState;
  isMockMode: boolean;
  onSetState: (state: ConnectionState) => void;
  onResetLive: () => void;
}

export const DemoStateSwitcher: React.FC<DemoStateSwitcherProps> = ({
  currentState,
  isMockMode,
  onSetState,
  onResetLive,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const states: { label: string; state: ConnectionState }[] = [
    { label: "1. Landing", state: "idle" },
    { label: "2. Room Ready (QR)", state: "waiting" },
    { label: "3. Connecting", state: "connecting" },
    { label: "4. Connected (Dropzone)", state: "connected" },
    { label: "5. Transferring (67%)", state: "transferring" },
    { label: "6. Completed (Success)", state: "completed" },
    { label: "7. Disconnected", state: "disconnected" },
    { label: "8. Expired Room", state: "expired" },
  ];

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center">
      {/* Expanded States Menu */}
      {isOpen && (
        <div className="mb-2 p-3 rounded-2xl glass-panel border border-cyan-500/30 bg-zinc-950/90 shadow-2xl backdrop-blur-xl flex flex-wrap items-center justify-center gap-1.5 max-w-xl animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="w-full text-center pb-1.5 border-b border-white/5 flex items-center justify-between px-2">
            <span className="text-[10px] uppercase font-mono tracking-widest text-cyan-400 font-semibold">
              Milestone 1 UI State Previewer
            </span>
            <button
              onClick={() => {
                sounds.click();
                onResetLive();
              }}
              className="text-[10px] font-mono text-emerald-400 hover:underline flex items-center gap-1"
            >
              <Play className="w-2.5 h-2.5" />
              Switch to Live WebRTC
            </button>
          </div>

          {states.map((item) => {
            const isSelected = currentState === item.state;
            return (
              <button
                key={item.state}
                onClick={() => {
                  sounds.click();
                  onSetState(item.state);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                  isSelected
                    ? "bg-cyan-500 text-zinc-950 font-bold shadow-glow"
                    : "bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Trigger Pill */}
      <button
        onClick={() => {
          sounds.click();
          setIsOpen(!isOpen);
        }}
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-panel border border-white/10 hover:border-cyan-400/40 text-xs font-mono text-zinc-300 hover:text-white shadow-lg transition-all active:scale-95 group"
      >
        <Sparkles className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-12 transition-transform" />
        <span>UI Preview States</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 uppercase">
          {currentState}
        </span>
        {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
};
