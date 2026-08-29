"use client";

import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, Link2, Smartphone } from "lucide-react";
import { sounds } from "@/lib/audio";

interface QRCodeCardProps {
  roomCode: string;
}

export const QRCodeCard: React.FC<QRCodeCardProps> = ({ roomCode }) => {
  const [copied, setCopied] = useState(false);
  const [joinUrl, setJoinUrl] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/?code=${roomCode}`;
      setJoinUrl(url);
    }
  }, [roomCode]);

  const handleCopy = () => {
    sounds.click();
    navigator.clipboard.writeText(joinUrl || roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* QR Display Container */}
      <div className="p-4 rounded-2xl bg-white/95 border border-white/20 shadow-2xl relative group">
        <QRCodeSVG
          value={joinUrl || `DROP:${roomCode}`}
          size={180}
          level="M"
          includeMargin={false}
          bgColor="#ffffff"
          fgColor="#09090b"
        />
        {/* Subtle center brand mark in QR */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-9 h-9 rounded-lg bg-zinc-950 border-2 border-white flex items-center justify-center shadow-md">
            <span className="font-mono text-cyan-400 font-bold text-xs">DR</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900/90 border border-white/10 hover:border-white/20 text-xs font-mono text-zinc-300 hover:text-white transition-all active:scale-95"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Link Copied!</span>
            </>
          ) : (
            <>
              <Link2 className="w-3.5 h-3.5 text-zinc-400" />
              <span>Copy Direct Link</span>
            </>
          )}
        </button>
      </div>

      <p className="text-[11px] text-zinc-400 font-mono flex items-center gap-1.5">
        <Smartphone className="w-3 h-3 text-cyan-400" />
        Scan with camera on phone or tablet
      </p>
    </div>
  );
};
