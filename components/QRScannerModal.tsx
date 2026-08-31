"use client";

import React, { useState, useEffect, useRef } from "react";
import { sounds } from "@/lib/audio";

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCodeDetected: (code: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onCodeDetected,
}) => {
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera access is not supported by your browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      if ("BarcodeDetector" in window) {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ["qr_code"],
        });

        const scanInterval = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const barcodes = await barcodeDetector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const rawValue = barcodes[0].rawValue;
              let extractedCode = rawValue;

              if (rawValue.includes("code=")) {
                const match = rawValue.match(/code=([A-Za-z0-9]{5})/i);
                if (match) extractedCode = match[1];
              } else if (rawValue.startsWith("DROP:")) {
                extractedCode = rawValue.replace("DROP:", "").trim();
              }

              if (extractedCode && extractedCode.length === 5) {
                clearInterval(scanInterval);
                sounds.connected();
                onCodeDetected(extractedCode.toUpperCase());
                onClose();
              }
            }
          } catch (err) {}
        }, 300);

        return () => clearInterval(scanInterval);
      }
    } catch (err: any) {
      console.warn("Camera error:", err);
      setError(err.message || "Could not access camera. Please enter code manually.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-ink/70">
      <div className="bg-paper w-full max-w-sm rounded-[4px] p-8 relative flex flex-col items-center space-y-6 border-hairline">
        <div className="flex items-center justify-between w-full border-b border-hairline pb-3">
          <span className="eyebrow-tag">CAMERA SCANNER</span>
          <button
            onClick={() => {
              sounds.click();
              onClose();
            }}
            className="text-caption uppercase text-ink hover:text-stone font-sans tracking-wider"
          >
            Close ✕
          </button>
        </div>

        <div className="text-center space-y-1">
          <h3 className="font-editorial text-2xl text-ink">Scan Drop QR</h3>
          <p className="text-caption text-graphite font-sans">
            Point camera at the QR code on the sending device
          </p>
        </div>

        {/* Video Viewport */}
        <div className="relative w-64 h-64 bg-fog border-hairline rounded-[4px] overflow-hidden flex items-center justify-center">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* Minimalist target box */}
          <div className="absolute inset-8 border border-ink/40 rounded-[2px] pointer-events-none" />

          {error && (
            <div className="absolute inset-0 p-6 bg-paper flex flex-col items-center justify-center text-center space-y-2">
              <p className="text-caption text-ink font-sans">{error}</p>
            </div>
          )}
        </div>

        <button
          onClick={() => {
            sounds.click();
            onClose();
          }}
          className="w-full py-3 bg-fog text-ink text-caption font-sans uppercase tracking-widest rounded-[4px] hover:bg-stone hover:text-paper transition-colors"
        >
          Enter Code Manually
        </button>
      </div>
    </div>
  );
};
