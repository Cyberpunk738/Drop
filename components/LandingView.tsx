"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Zap, ShieldCheck, HardDrive, Smartphone, Laptop, Radio, QrCode } from "lucide-react";
import { sounds } from "@/lib/audio";

interface LandingViewProps {
  onCreateDrop: () => void;
  onJoinDrop: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onCreateDrop,
  onJoinDrop,
}) => {
  const handleCreate = () => {
    sounds.click();
    onCreateDrop();
  };

  const handleJoin = () => {
    sounds.click();
    onJoinDrop();
  };

  return (
    <div className="w-full flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 sm:px-6 py-12 relative">
      {/* Sonar AirDrop Radar Animation in Background */}
      <div className="relative flex items-center justify-center mb-8">
        <div className="absolute w-44 h-44 rounded-full border border-cyan-500/20 animate-sonar pointer-events-none" />
        <div className="absolute w-44 h-44 rounded-full border border-emerald-500/15 animate-sonar-delayed pointer-events-none" />
        <div className="w-24 h-24 rounded-full bg-surface-100 border border-white/10 flex items-center justify-center shadow-glow relative z-10">
          <Radio className="w-10 h-10 text-brand-400 animate-pulse" />
        </div>

        {/* Ambient Orbiting Devices */}
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-3 -right-10 px-2.5 py-1 rounded-full glass-panel flex items-center gap-1.5 text-xs text-zinc-300 font-mono"
        >
          <Laptop className="w-3.5 h-3.5 text-cyan-400" />
          <span>Mac</span>
        </motion.div>

        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -bottom-3 -left-12 px-2.5 py-1 rounded-full glass-panel flex items-center gap-1.5 text-xs text-zinc-300 font-mono"
        >
          <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
          <span>iPhone</span>
        </motion.div>
      </div>

      {/* Hero Content */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-xl mx-auto space-y-4"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/90 border border-white/10 text-xs text-zinc-400 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
          WebRTC Direct Transport • v1.0
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white font-mono">
          DROP
        </h1>

        <p className="text-xl sm:text-2xl font-light text-zinc-200">
          Send files. <span className="text-zinc-500 font-normal">No account. No upload.</span>
        </p>

        <p className="text-sm text-zinc-400 font-mono max-w-md mx-auto">
          Files move directly between your devices through encrypted peer-to-peer data channels.
        </p>

        {/* Action Buttons */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md mx-auto">
          <button
            onClick={handleCreate}
            className="w-full sm:w-auto flex-1 group relative inline-flex items-center justify-center px-8 py-3.5 rounded-xl font-medium text-sm text-zinc-950 bg-gradient-to-r from-cyan-400 to-brand-400 hover:from-cyan-300 hover:to-brand-300 shadow-glow transition-all active:scale-[0.98] font-mono tracking-wide"
          >
            <span>Create a Drop</span>
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={handleJoin}
            className="w-full sm:w-auto flex-1 inline-flex items-center justify-center px-8 py-3.5 rounded-xl font-medium text-sm text-zinc-200 glass-panel-interactive hover:text-white transition-all active:scale-[0.98] font-mono tracking-wide"
          >
            <QrCode className="w-4 h-4 mr-2 text-zinc-400" />
            <span>Join a Drop</span>
          </button>
        </div>
      </motion.div>

      {/* Feature Badges */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl w-full mt-16 pt-8 border-t border-white/5"
      >
        <div className="glass-panel p-4 rounded-xl flex items-start gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-mono font-medium text-zinc-200 uppercase tracking-wider">
              AirDrop for the Web
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Connect any browser or phone in seconds with a 5-letter code or QR scan.
            </p>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl flex items-start gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-mono font-medium text-zinc-200 uppercase tracking-wider">
              Zero Server Storage
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Files bypass all servers completely and stream peer-to-peer encrypted.
            </p>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl flex items-start gap-3">
          <div className="p-2 rounded-lg bg-brand-500/10 text-brand-400">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-mono font-medium text-zinc-200 uppercase tracking-wider">
              Chunked Streaming
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Transfer multi-gigabyte files with adaptive 64KB backpressure control.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
