"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Camera, AlertCircle } from "lucide-react";
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
  const [isScanning, setIsScanning] = useState(false);
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
    setIsScanning(true);

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

      // Check if native BarcodeDetector API is available in modern browsers
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

              // Parse URL or raw format if present
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
          } catch (err) {
            // Detector loop frame ignore
          }
        }, 300);

        return () => clearInterval(scanInterval);
      }
    } catch (err: any) {
      console.warn("Camera init error:", err);
      setError(err.message || "Could not access camera. Please enter the room code manually.");
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="glass-panel w-full max-w-sm rounded-3xl p-6 relative flex flex-col items-center space-y-4">
        <button
          onClick={() => {
            sounds.click();
            onClose();
          }}
          className="absolute top-4 right-4 p-2 rounded-full bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center space-y-1">
          <h3 className="text-lg font-mono font-bold text-white">Scan Drop QR</h3>
          <p className="text-xs text-zinc-400 font-mono">
            Point camera at the QR code on the sending device
          </p>
        </div>

        {/* Video Viewport / Viewfinder */}
        <div className="relative w-64 h-64 rounded-2xl overflow-hidden bg-zinc-950 border border-cyan-500/30 flex items-center justify-center shadow-glow">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* Viewfinder Target Box */}
          <div className="absolute inset-8 border-2 border-cyan-400/80 rounded-xl pointer-events-none flex items-center justify-center">
            <div className="w-full h-0.5 bg-cyan-400/60 animate-pulse" />
          </div>

          {error && (
            <div className="absolute inset-0 p-4 bg-zinc-950/90 flex flex-col items-center justify-center text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-amber-400" />
              <p className="text-xs text-zinc-300 font-mono">{error}</p>
            </div>
          )}
        </div>

        <button
          onClick={() => {
            sounds.click();
            onClose();
          }}
          className="w-full py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-xs font-mono text-zinc-300 hover:text-white"
        >
          Enter Code Manually
        </button>
      </div>
    </div>
  );
};
