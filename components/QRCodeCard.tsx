"use client";

import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Link2, Check } from "lucide-react";
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
      {/* QR Container */}
      <div className="p-4 bg-paper border-hairline rounded-[4px] shadow-sm">
        <QRCodeSVG
          value={joinUrl || `DROP:${roomCode}`}
          size={180}
          level="M"
          includeMargin={false}
          bgColor="#ffffff"
          fgColor="#070707"
        />
      </div>

      <div className="flex flex-col items-center space-y-2">
        <button
          onClick={handleCopy}
          className="px-5 py-2 bg-paper text-ink border-hairline text-caption uppercase font-sans tracking-widest rounded-[4px] hover:bg-ink hover:text-paper transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Link Copied!</span>
            </>
          ) : (
            <>
              <Link2 className="w-3.5 h-3.5" />
              <span>Copy Direct Link</span>
            </>
          )}
        </button>

        <p className="text-caption text-graphite font-sans">
          Point phone camera at QR to join session automatically
        </p>
      </div>
    </div>
  );
};
