"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { QRCodeCard } from "./QRCodeCard";
import { Copy, Check, Info } from "lucide-react";
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
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      transition={{ duration: 0.35 }}
      className="w-full max-w-[800px] mx-auto px-6 py-10 sm:py-16 space-y-8"
    >
      {/* What to do banner (UX helper) */}
      <div className="bg-paper p-5 sm:p-6 rounded-[4px] border-hairline space-y-3">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-ink flex-shrink-0" />
          <span className="eyebrow-tag text-ink font-semibold">WHAT TO DO NEXT</span>
        </div>
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-4 text-caption text-graphite font-sans list-decimal list-inside">
          <li className="space-y-0.5">
            <span className="text-ink font-medium">Keep this tab open</span>
            <p className="text-[11px] text-stone">Do not refresh or close.</p>
          </li>
          <li className="space-y-0.5">
            <span className="text-ink font-medium">Open on 2nd device</span>
            <p className="text-[11px] text-stone">Scan QR or enter code.</p>
          </li>
          <li className="space-y-0.5">
            <span className="text-ink font-medium">Transfer files</span>
            <p className="text-[11px] text-stone">Direct P2P streaming.</p>
          </li>
        </ol>
      </div>

      <div className="bg-fog p-8 sm:p-14 rounded-[4px] border-hairline space-y-8 text-center">
        {/* Eyebrow & Navigation */}
        <div className="flex items-center justify-between border-b border-hairline pb-4">
          <button
            onClick={() => {
              sounds.click();
              onCancel();
            }}
            className="text-caption uppercase text-ink hover:text-stone tracking-widest transition-colors font-sans"
          >
            ← Cancel Session
          </button>

          <span className="eyebrow-tag">ROOM CODE ACTIVE / 15M TTL</span>
        </div>

        {/* Heading */}
        <div className="space-y-2 max-w-md mx-auto">
          <h2 className="font-editorial text-4xl sm:text-5xl text-ink font-normal">
            Your Drop is ready
          </h2>
          <p className="text-caption text-graphite font-sans">
            Share this 5-letter code or scan the QR code with your other device
          </p>
        </div>

        {/* Room Code Display with Clear Copy CTA */}
        <div className="flex flex-col items-center space-y-3">
          <div className="flex items-center justify-center gap-2 sm:gap-3 p-3 bg-paper border-hairline rounded-[4px]">
            {roomCode.split("").map((char, index) => (
              <span
                key={index}
                className="w-12 h-16 sm:w-16 sm:h-20 bg-fog border-hairline rounded-[4px] flex items-center justify-center font-mono text-3xl sm:text-4xl text-ink font-normal select-all"
              >
                {char}
              </span>
            ))}
          </div>

          <button
            onClick={handleCopyCode}
            className="px-6 py-2.5 bg-ink text-paper text-caption font-sans uppercase tracking-widest rounded-[4px] hover:bg-stone hover:text-ink transition-colors flex items-center gap-2 cursor-pointer active:scale-95"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Code Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy 5-Letter Code</span>
              </>
            )}
          </button>
        </div>

        {/* QR Code Section */}
        <div className="pt-2">
          <QRCodeCard roomCode={roomCode} />
        </div>

        {/* Live Status Footnote */}
        <div className="pt-6 border-t border-hairline flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-ink animate-pulse" />
          <span className="eyebrow-tag">Waiting for 2nd device to connect...</span>
        </div>
      </div>
    </motion.div>
  );
};
