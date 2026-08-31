"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, QrCode, Shield, Zap, RefreshCw } from "lucide-react";
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
    <div className="w-full max-w-[1400px] mx-auto px-6 sm:px-12 py-8 sm:py-14 flex flex-col space-y-16 pb-32">
      {/* Top Eyebrow Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-1"
      >
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-ink" />
          <p className="eyebrow-tag">01 / DIRECT PEER-TO-PEER TRANSFER</p>
        </div>
        <p className="text-caption text-graphite font-sans">
          Fast device-to-device file streaming without accounts, apps, or cloud storage.
        </p>
      </motion.div>

      {/* Editorial Display Headline Block */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="space-y-8 max-w-5xl"
      >
        <h1 className="display-headline text-4xl sm:text-6xl md:text-7xl lg:text-[84px] tracking-tight">
          Send files<span className="text-stone">.</span> <br />
          Direct <span className="text-stone italic">&</span> private<span className="text-stone">.</span>
        </h1>

        <div className="space-y-6 max-w-2xl">
          <p className="text-body text-ink font-sans leading-relaxed">
            DROP creates an encrypted WebRTC connection between two browsers. Files stream in 64KB chunks directly between hardware without ever touching our servers.
          </p>

          {/* Action CTAs with High Contrast Background Colors */}
          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <button
              onClick={handleCreate}
              className="px-8 py-4 bg-ink text-paper text-caption font-sans uppercase tracking-widest rounded-[4px] hover:bg-stone hover:text-ink transition-all duration-200 text-center flex items-center justify-center gap-2.5 font-medium cursor-pointer shadow-md active:scale-[0.98]"
            >
              <span>Create a Drop</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleJoin}
              className="px-8 py-4 bg-fog text-ink border-hairline text-caption font-sans uppercase tracking-widest rounded-[4px] hover:bg-ink hover:text-paper transition-all duration-200 text-center flex items-center justify-center gap-2.5 font-medium cursor-pointer active:scale-[0.98]"
            >
              <QrCode className="w-4 h-4" />
              <span>Join a Drop</span>
            </button>
          </div>

          <p className="text-[11px] text-stone font-sans uppercase tracking-wider">
            Works between phone & computer • zero setup • any file size
          </p>
        </div>
      </motion.div>

      {/* Step-by-Step UX Guide */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="p-8 sm:p-10 bg-fog border-hairline rounded-[4px] space-y-6"
      >
        <div className="flex items-center justify-between border-b border-hairline pb-4">
          <span className="eyebrow-tag">HOW IT WORKS — 3 SIMPLE STEPS</span>
          <span className="text-caption text-graphite font-sans">Takes less than 5 seconds</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-2">
            <div className="w-7 h-7 rounded-[4px] bg-ink text-paper flex items-center justify-center text-xs font-mono font-medium">
              1
            </div>
            <h4 className="font-editorial text-2xl text-ink font-normal">
              Create a Drop
            </h4>
            <p className="text-caption text-graphite font-sans leading-relaxed">
              Click <strong>Create a Drop</strong> to generate a temporary 5-letter session code and QR code.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-7 h-7 rounded-[4px] bg-ink text-paper flex items-center justify-center text-xs font-mono font-medium">
              2
            </div>
            <h4 className="font-editorial text-2xl text-ink font-normal">
              Connect 2nd Device
            </h4>
            <p className="text-caption text-graphite font-sans leading-relaxed">
              On your phone or other browser, open DROP and scan the QR or type the 5-letter code to pair.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-7 h-7 rounded-[4px] bg-ink text-paper flex items-center justify-center text-xs font-mono font-medium">
              3
            </div>
            <h4 className="font-editorial text-2xl text-ink font-normal">
              Drop & Transfer
            </h4>
            <p className="text-caption text-graphite font-sans leading-relaxed">
              Drag your files into the dropzone. Data streams directly between browsers and downloads instantly.
            </p>
          </div>
        </div>
      </motion.div>

      {/* 3-Column Specifications Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10 border-t border-hairline"
      >
        <div className="bg-paper p-6 sm:p-8 rounded-[4px] border-hairline space-y-3">
          <p className="eyebrow-tag">SPECIFICATION 01</p>
          <h3 className="font-editorial text-subheading text-ink">
            Direct P2P Link
          </h3>
          <p className="text-caption text-graphite leading-relaxed font-sans">
            Encrypted WebRTC DataChannels allow two devices to transfer data point-to-point without cloud storage latency.
          </p>
        </div>

        <div className="bg-paper p-6 sm:p-8 rounded-[4px] border-hairline space-y-3">
          <p className="eyebrow-tag">SPECIFICATION 02</p>
          <h3 className="font-editorial text-subheading text-ink">
            Zero Server Knowledge
          </h3>
          <p className="text-caption text-graphite leading-relaxed font-sans">
            The WebSocket signaling server facilitates the initial handshake and immediately yields to the browser peers.
          </p>
        </div>

        <div className="bg-paper p-6 sm:p-8 rounded-[4px] border-hairline space-y-3">
          <p className="eyebrow-tag">SPECIFICATION 03</p>
          <h3 className="font-editorial text-subheading text-ink">
            Chunked Streaming
          </h3>
          <p className="text-caption text-graphite leading-relaxed font-sans">
            Engineered with 64KB chunking and buffer backpressure to transfer gigabyte-sized files without browser memory leaks.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
