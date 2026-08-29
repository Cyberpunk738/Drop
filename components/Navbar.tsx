"use client";

import React from "react";
import { ConnectionState, DeviceInfo } from "@/types";
import { Radio, Laptop, Smartphone, Wifi, Shield, RefreshCw } from "lucide-react";

interface NavbarProps {
  connectionState: ConnectionState;
  localDevice: DeviceInfo;
  remoteDevice: DeviceInfo | null;
  onReset: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  connectionState,
  localDevice,
  remoteDevice,
  onReset,
}) => {
  const getStatusBadge = () => {
    switch (connectionState) {
      case "idle":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
            Ready
          </span>
        );
      case "creating":
      case "waiting":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-950/60 text-cyan-400 border border-cyan-800/50">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            Waiting for Peer
          </span>
        );
      case "connecting":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-950/60 text-amber-400 border border-amber-800/50">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Handshaking...
          </span>
        );
      case "connected":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Direct P2P Link
          </span>
        );
      case "transferring":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-brand-500/10 text-brand-400 border border-brand-500/30 shadow-glow">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
            Streaming Chunks
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-700/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Transfer Complete
          </span>
        );
      case "disconnected":
      case "failed":
      case "expired":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-950/60 text-rose-400 border border-rose-800/50">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            Disconnected
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <header className="w-full border-b border-white/5 bg-zinc-950/40 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <button
          onClick={onReset}
          className="flex items-center gap-2.5 group focus:outline-none transition-transform active:scale-95"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 via-cyan-500 to-emerald-400 p-[1px] shadow-glow">
            <div className="w-full h-full bg-zinc-950 rounded-[7px] flex items-center justify-center">
              <Radio className="w-4 h-4 text-brand-400 group-hover:rotate-45 transition-transform duration-300" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold tracking-wider text-lg text-white font-mono">DROP</span>
            <span className="text-[10px] tracking-widest uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/40">
              P2P
            </span>
          </div>
        </button>

        {/* Center / Status */}
        <div className="hidden sm:flex items-center gap-3">
          {getStatusBadge()}
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-mono">
            <Shield className="w-3.5 h-3.5 text-emerald-500/70" />
            <span>End-to-End Encrypted</span>
          </div>
        </div>

        {/* Right / Device badge & Reset */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-white/5 text-xs text-zinc-300 font-mono">
            {localDevice.deviceType === "mobile" ? (
              <Smartphone className="w-3.5 h-3.5 text-zinc-400" />
            ) : (
              <Laptop className="w-3.5 h-3.5 text-zinc-400" />
            )}
            <span className="truncate max-w-[120px] sm:max-w-[180px]">
              {localDevice.browser} • {localDevice.os}
            </span>
          </div>

          {connectionState !== "idle" && (
            <button
              onClick={onReset}
              title="Return to Home"
              className="p-1.5 rounded-lg bg-zinc-900/80 border border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
