"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, QrCode, AlertCircle } from "lucide-react";
import { QRScannerModal } from "./QRScannerModal";
import { sounds } from "@/lib/audio";

interface JoinDropViewProps {
  initialCode?: string;
  onJoin: (code: string) => void;
  onBack: () => void;
  errorMessage: string | null;
}

export const JoinDropView: React.FC<JoinDropViewProps> = ({
  initialCode = "",
  onJoin,
  onBack,
  errorMessage,
}) => {
  const [digits, setDigits] = useState<string[]>(() => {
    const padded = (initialCode || "").padEnd(5, "").slice(0, 5).split("");
    return [padded[0] || "", padded[1] || "", padded[2] || "", padded[3] || "", padded[4] || ""];
  });
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focus first empty input on mount
    const firstEmpty = digits.findIndex((d) => !d);
    const indexToFocus = firstEmpty === -1 ? 4 : firstEmpty;
    inputRefs.current[indexToFocus]?.focus();
  }, []);

  const handleInputChange = (index: number, value: string) => {
    const upper = value.toUpperCase().slice(-1);
    const newDigits = [...digits];
    newDigits[index] = upper;
    setDigits(newDigits);

    sounds.click();

    // Auto-advance to next input
    if (upper && index < 4) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "Enter") {
      submitCode();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").trim().toUpperCase();

    let extracted = pasteData;
    if (pasteData.includes("code=")) {
      const match = pasteData.match(/code=([A-Za-z0-9]{5})/i);
      if (match) extracted = match[1];
    } else if (pasteData.startsWith("DROP:")) {
      extracted = pasteData.replace("DROP:", "").trim();
    }

    const clean = extracted.replace(/[^A-Z0-9]/g, "").slice(0, 5);
    const newDigits = clean.padEnd(5, "").slice(0, 5).split("");
    setDigits(newDigits);

    sounds.click();

    if (clean.length === 5) {
      inputRefs.current[4]?.focus();
      onJoin(clean);
    }
  };

  const submitCode = () => {
    const fullCode = digits.join("");
    if (fullCode.length === 5) {
      sounds.click();
      onJoin(fullCode);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-md mx-auto py-8 px-4 sm:px-6"
    >
      <div className="glass-panel p-6 sm:p-8 rounded-3xl relative overflow-hidden shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              sounds.click();
              onBack();
            }}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white font-mono transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        </div>

        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-white font-mono">
            Join a Drop
          </h2>
          <p className="text-xs text-zinc-400 font-mono">
            Enter the 5-character code from the sending device
          </p>
        </div>

        {/* 5-Box Room Code Input */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 py-2" onPaste={handlePaste}>
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleInputChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-12 h-14 sm:w-14 sm:h-16 text-center font-mono text-2xl sm:text-3xl font-extrabold uppercase rounded-2xl bg-zinc-950/80 border border-white/10 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 text-cyan-300 outline-none transition-all shadow-inner"
            />
          ))}
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/50 flex items-center gap-2 text-xs text-rose-300 font-mono">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <button
            onClick={submitCode}
            disabled={digits.join("").length !== 5}
            className="w-full flex items-center justify-center py-3.5 rounded-xl font-mono text-sm font-medium text-zinc-950 bg-gradient-to-r from-cyan-400 to-brand-400 hover:from-cyan-300 hover:to-brand-300 disabled:opacity-40 disabled:cursor-not-allowed shadow-glow transition-all active:scale-[0.98]"
          >
            <span>Connect & Join Drop</span>
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>

          <button
            onClick={() => {
              sounds.click();
              setIsScannerOpen(true);
            }}
            className="w-full flex items-center justify-center py-3 rounded-xl font-mono text-xs font-medium text-zinc-300 glass-panel-interactive hover:text-white transition-all active:scale-[0.98]"
          >
            <QrCode className="w-4 h-4 mr-2 text-cyan-400" />
            <span>Scan QR Code with Camera</span>
          </button>
        </div>
      </div>

      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onCodeDetected={(code) => {
          setDigits(code.split(""));
          onJoin(code);
        }}
      />
    </motion.div>
  );
};
