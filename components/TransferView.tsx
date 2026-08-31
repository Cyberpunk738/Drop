"use client";

import React from "react";
import { motion } from "framer-motion";
import { DeviceInfo, FileItem, ConnectionState } from "@/types";
import { DropZone } from "./DropZone";
import { TransferProgress } from "./TransferProgress";
import { Send, CheckCircle, Plus, LogOut, Info } from "lucide-react";
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      transition={{ duration: 0.35 }}
      className="w-full max-w-[800px] mx-auto px-6 py-10 sm:py-16 space-y-6"
    >
      {/* Peer Header Banner */}
      <div className="bg-fog p-6 rounded-[4px] border-hairline flex items-baseline justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-ink animate-pulse" />
            <p className="eyebrow-tag">DIRECT WEBRTC CHANNEL ESTABLISHED</p>
          </div>
          <h3 className="font-editorial text-2xl sm:text-3xl text-ink font-normal">
            Connected to {remoteDevice?.deviceName || "Remote Peer"}
          </h3>
        </div>

        <button
          onClick={() => {
            sounds.click();
            onLeave();
          }}
          className="text-caption uppercase text-ink hover:text-stone tracking-widest transition-colors font-sans underline underline-offset-4 flex items-center gap-1 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Disconnect</span>
        </button>
      </div>

      {/* Instructional Guidance Box (What to do now) */}
      {!isCompleted && !isTransferring && (
        <div className="bg-paper p-4 sm:p-5 rounded-[4px] border-hairline flex items-start gap-3">
          <Info className="w-4 h-4 text-ink flex-shrink-0 mt-0.5" />
          <div className="text-caption text-graphite font-sans space-y-0.5">
            <p className="text-ink font-medium">Ready to transfer:</p>
            <p>
              {pendingFiles.length > 0
                ? `${pendingFiles.length} file(s) selected. Click "Send Files" below to start streaming.`
                : "Drop any file into the zone below or click browse. Either device can send files at any time."}
            </p>
          </div>
        </div>
      )}

      {/* Disconnection Notice */}
      {connectionState === "disconnected" && (
        <div className="p-6 bg-fog border-hairline rounded-[4px] space-y-1">
          <p className="text-body text-ink font-medium">Device Disconnected</p>
          <p className="text-caption text-graphite font-sans">
            The remote peer closed their browser tab or network connection was lost.
          </p>
        </div>
      )}

      {/* Main Transfer Area */}
      {!isCompleted ? (
        <div className="space-y-6">
          <DropZone onFilesSelected={onFilesSelected} disabled={isTransferring} />

          {files.length > 0 && (
            <div className="space-y-6">
              <TransferProgress
                files={files}
                activeFileId={activeFileId}
                onCancelTransfer={onCancelTransfer}
              />

              {pendingFiles.length > 0 && !isTransferring && (
                <button
                  onClick={() => {
                    sounds.click();
                    onSendFiles();
                  }}
                  className="w-full py-4 bg-ink text-paper text-caption font-sans uppercase tracking-widest rounded-[4px] hover:bg-stone hover:text-ink transition-colors flex items-center justify-center gap-2 cursor-pointer font-medium shadow-sm active:scale-[0.98]"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    Send {pendingFiles.length} {pendingFiles.length === 1 ? "File" : "Files"} Now
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Completed State */
        <div className="bg-fog p-8 sm:p-14 rounded-[4px] border-hairline text-center space-y-8">
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-[4px] bg-ink text-paper flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="w-6 h-6" />
            </div>
            <p className="eyebrow-tag">TRANSFER SUCCESSFUL</p>
            <h2 className="font-editorial text-4xl sm:text-5xl text-ink font-normal">
              Transfer Complete
            </h2>
            <p className="text-caption text-graphite font-sans">
              {files.length} {files.length === 1 ? "file was" : "files were"} streamed directly point-to-point without saving to any server.
            </p>
          </div>

          <TransferProgress files={files} activeFileId={null} />

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => {
                sounds.click();
                onFilesSelected([]);
              }}
              className="w-full sm:w-auto px-8 py-4 bg-ink text-paper text-caption font-sans uppercase tracking-widest rounded-[4px] hover:bg-stone hover:text-ink transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Send Another File</span>
            </button>

            <button
              onClick={() => {
                sounds.click();
                onLeave();
              }}
              className="w-full sm:w-auto px-8 py-4 bg-paper text-ink border-hairline text-caption font-sans uppercase tracking-widest rounded-[4px] hover:bg-fog transition-colors cursor-pointer active:scale-[0.98]"
            >
              <span>Leave Session</span>
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};
