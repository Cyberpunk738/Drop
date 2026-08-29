"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Radio, ArrowLeft, Shield } from "lucide-react";
import { QRCodeCard } from "./QRCodeCard";
import { sounds } from "@/lib/audio";

interface CreateDropViewProps {
  roomCode: string;
  onCancel: () => void;
}

export const CreateDropView: React.FC<CreateDropViewProps> = ({
  roomCode,
  onCancel,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    sounds.click();
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-lg mx-auto py-8 px-4 sm:px-6"
    >
      <div className="glass-panel p-6 sm:p-8 rounded-3xl relative overflow-hidden shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              sounds.click();
              onCancel();
            }}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white font-mono transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Cancel</span>
          </button>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/60 text-cyan-400 border border-cyan-800/40 text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            <span>Live Session</span>
          </div>
        </div>

        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-white font-mono">
            Your Drop is ready
          </h2>
          <p className="text-xs text-zinc-400 font-mono">
            Share this code or scan the QR on your other device
          </p>
        </div>

        {/* Big Room Code Display */}
        <div className="flex flex-col items-center">
          <button
            onClick={handleCopyCode}
            title="Click to copy room code"
            className="group relative flex items-center justify-center gap-2 p-3 sm:p-4 rounded-2xl bg-zinc-950/80 border border-white/10 hover:border-cyan-500/50 transition-all active:scale-95 shadow-inner"
          >
            <div className="flex items-center gap-2 font-mono text-3xl sm:text-4xl font-extrabold tracking-widest text-cyan-400 text-glow">
              {roomCode.split("").map((char, index) => (
                <span
                  key={index}
                  className="w-10 sm:w-12 h-14 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center shadow"
                >
                  {char}
                </span>
              ))}
            </div>

            <div className="absolute -top-2.5 -right-2.5 p-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 group-hover:text-cyan-300 shadow">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </div>
          </button>

          <span className="text-[11px] text-zinc-400 font-mono mt-2">
            {copied ? "Room code copied to clipboard!" : "Click code to copy"}
          </span>
        </div>

        {/* QR Code */}
        <div className="pt-2">
          <QRCodeCard roomCode={roomCode} />
        </div>

        {/* Radar & Status bar */}
        <div className="pt-4 border-t border-white/5 flex items-center justify-center gap-2.5 text-xs text-zinc-400 font-mono">
          <div className="relative flex items-center justify-center w-4 h-4">
            <span className="absolute w-4 h-4 rounded-full bg-cyan-400/30 animate-ping" />
            <Radio className="w-3.5 h-3.5 text-cyan-400 relative z-10" />
          </div>
          <span>Waiting for connection...</span>
        </div>
      </div>
    </motion.div>
  );
};
