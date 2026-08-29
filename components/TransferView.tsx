"use client";

import React, { useEffect } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import {
  Laptop,
  Smartphone,
  ShieldCheck,
  Send,
  CheckCircle,
  Plus,
  LogOut,
  AlertCircle,
} from "lucide-react";
import { DeviceInfo, FileItem, ConnectionState } from "@/types";
import { DropZone } from "./DropZone";
import { TransferProgress } from "./TransferProgress";
import { sounds } from "@/lib/audio";

interface TransferViewProps {
  connectionState: ConnectionState;
  remoteDevice: DeviceInfo | null;
  files: FileItem[];
  activeFileId: string | null;
  role: "sender" | "receiver" | null;
  errorMessage: string | null;
  onFilesSelected: (files: FileList | File[]) => void;
  onSendFiles: () => void;
  onCancelTransfer: () => void;
  onLeave: () => void;
}

export const TransferView: React.FC<TransferViewProps> = ({
  connectionState,
  remoteDevice,
  files,
  activeFileId,
  role,
  errorMessage,
  onFilesSelected,
  onSendFiles,
  onCancelTransfer,
  onLeave,
}) => {
  const isCompleted =
    connectionState === "completed" ||
    (files.length > 0 && files.every((f) => f.status === "completed"));

  const pendingFiles = files.filter((f) => f.status === "pending");
  const isTransferring = connectionState === "transferring";

  // Trigger celebration confetti on completion
  useEffect(() => {
    if (isCompleted) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#00f0ff", "#10b981", "#38bdf8", "#ffffff"],
      });
    }
  }, [isCompleted]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-2xl mx-auto py-8 px-4 sm:px-6 space-y-6"
    >
      {/* Peer Header Banner */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
            {remoteDevice?.deviceType === "mobile" ? (
              <Smartphone className="w-5 h-5" />
            ) : (
              <Laptop className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 font-mono">Connected to</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <h3 className="font-mono text-sm font-semibold text-white">
              {remoteDevice?.deviceName || "Remote Peer Device"}
            </h3>
          </div>
        </div>

        <button
          onClick={() => {
            sounds.click();
            onLeave();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 hover:border-rose-500/40 text-xs font-mono text-zinc-400 hover:text-rose-300 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Disconnect</span>
        </button>
      </div>

      {/* Disconnection Warning */}
      {connectionState === "disconnected" && (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-800/60 flex items-center gap-3 text-xs font-mono text-amber-200">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div className="space-y-0.5">
            <p className="font-semibold">Device disconnected.</p>
            <p className="text-amber-300/80">
              The remote peer left the room or connection was lost.
            </p>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {!isCompleted ? (
        <div className="space-y-6">
          {/* Dropzone for selecting files */}
          <DropZone onFilesSelected={onFilesSelected} disabled={isTransferring} />

          {/* Files Progress / Queue */}
          {files.length > 0 && (
            <div className="space-y-4">
              <TransferProgress
                files={files}
                activeFileId={activeFileId}
                onCancelTransfer={onCancelTransfer}
              />

              {/* Action Buttons */}
              {pendingFiles.length > 0 && !isTransferring && (
                <button
                  onClick={() => {
                    sounds.click();
                    onSendFiles();
                  }}
                  className="w-full flex items-center justify-center py-3.5 rounded-xl font-mono text-sm font-semibold text-zinc-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 shadow-glow transition-all active:scale-[0.98]"
                >
                  <Send className="w-4 h-4 mr-2" />
                  <span>
                    Send {pendingFiles.length} {pendingFiles.length === 1 ? "File" : "Files"}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Completed State */
        <div className="glass-panel p-6 sm:p-8 rounded-3xl text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 shadow-glow-emerald">
            <CheckCircle className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-bold font-mono text-white">Transfer Complete</h2>
            <p className="text-xs font-mono text-zinc-400">
              {files.length} {files.length === 1 ? "file was" : "files were"} transferred directly between devices.
            </p>
          </div>

          <TransferProgress
            files={files}
            activeFileId={null}
          />

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => {
                sounds.click();
                onFilesSelected([]);
              }}
              className="w-full sm:w-auto flex-1 inline-flex items-center justify-center px-6 py-3 rounded-xl font-mono text-xs font-medium text-zinc-950 bg-cyan-400 hover:bg-cyan-300 shadow-glow transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span>Send Another File</span>
            </button>

            <button
              onClick={() => {
                sounds.click();
                onLeave();
              }}
              className="w-full sm:w-auto flex-1 inline-flex items-center justify-center px-6 py-3 rounded-xl font-mono text-xs font-medium text-zinc-300 glass-panel-interactive hover:text-white transition-all active:scale-[0.98]"
            >
              <span>Leave Drop</span>
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};
