"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { QRScannerModal } from "./QRScannerModal";
import { ArrowRight, QrCode, Info } from "lucide-react";
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
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      transition={{ duration: 0.35 }}
      className="w-full max-w-[600px] mx-auto px-6 py-10 sm:py-16 space-y-6"
    >
      {/* What to do UX notice */}
      <div className="bg-paper p-5 rounded-[4px] border-hairline flex items-start gap-3">
        <Info className="w-4 h-4 text-ink flex-shrink-0 mt-0.5" />
        <div className="space-y-1 text-caption text-graphite font-sans">
          <p className="text-ink font-medium">How to join a drop:</p>
          <p>
            Look at the screen of the device that created the Drop. Enter the 5-letter code shown there or use your camera to scan their QR code.
          </p>
        </div>
      </div>

      <div className="bg-fog p-8 sm:p-14 rounded-[4px] border-hairline space-y-8">
        {/* Header Navigation */}
        <div className="flex items-center justify-between border-b border-hairline pb-4">
          <button
            onClick={() => {
              sounds.click();
              onBack();
            }}
            className="text-caption uppercase text-ink hover:text-stone tracking-widest transition-colors font-sans"
          >
            ← Return to Home
          </button>

          <span className="eyebrow-tag">DIRECT CONNECT</span>
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h2 className="font-editorial text-4xl sm:text-5xl text-ink font-normal">
            Join a Drop
          </h2>
          <p className="text-caption text-graphite font-sans">
            Enter the 5-letter session code below
          </p>
        </div>

        {/* 5-Box Inputs */}
        <div
          className="flex items-center justify-center gap-2 sm:gap-3 py-2"
          onPaste={handlePaste}
        >
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
              className="w-12 h-16 sm:w-16 sm:h-20 text-center font-mono text-3xl sm:text-4xl uppercase rounded-[4px] bg-paper border-hairline focus:border-ink text-ink outline-none transition-colors shadow-sm"
            />
          ))}
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-4 rounded-[4px] bg-paper border-hairline text-center">
            <p className="text-caption text-ink font-sans font-medium">{errorMessage}</p>
          </div>
        )}

        {/* Action Buttons with distinct backgrounds */}
        <div className="space-y-3 pt-2">
          <button
            onClick={submitCode}
            disabled={digits.join("").length !== 5}
            className="w-full py-4 bg-ink text-paper text-caption font-sans uppercase tracking-widest rounded-[4px] hover:bg-stone hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer font-medium active:scale-[0.98]"
          >
            <span>Connect & Join Drop</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              sounds.click();
              setIsScannerOpen(true);
            }}
            className="w-full py-3.5 bg-paper text-ink border-hairline text-caption font-sans uppercase tracking-widest rounded-[4px] hover:bg-ink hover:text-paper transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
          >
            <QrCode className="w-3.5 h-3.5" />
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
