"use client";

import React from "react";
import { motion } from "framer-motion";
import { Download, Check, AlertCircle } from "lucide-react";
import { FileItem } from "@/types";
import { formatBytes, formatSpeed, formatDuration } from "@/lib/device";
import { sounds } from "@/lib/audio";

interface TransferProgressProps {
  files: FileItem[];
  activeFileId: string | null;
  onCancelTransfer?: () => void;
}

export const TransferProgress: React.FC<TransferProgressProps> = ({
  files,
  activeFileId,
}) => {
  return (
    <div className="w-full space-y-4">
      {files.map((item) => {
        const isActive = item.id === activeFileId || item.status === "transferring";
        const isCompleted = item.status === "completed";
        const isError = item.status === "error";

        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-6 rounded-[4px] border-hairline transition-colors ${
              isActive ? "bg-fog border-ink" : "bg-paper"
            }`}
          >
            {/* Header info */}
            <div className="flex items-baseline justify-between gap-4">
              <div className="min-w-0">
                <p className="text-body font-sans text-ink truncate font-medium">
                  {item.name}
                </p>
                <p className="text-caption text-graphite font-sans">
                  {formatBytes(item.size)}
                </p>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-3 flex-shrink-0">
                {isCompleted ? (
                  <span className="text-caption uppercase text-ink font-sans tracking-wider border-hairline px-3 py-1 rounded-[4px] bg-fog flex items-center gap-1">
                    <Check className="w-3 h-3 text-ink" />
                    <span>Transferred</span>
                  </span>
                ) : isError ? (
                  <span className="text-caption uppercase text-ink font-sans tracking-wider border-hairline px-3 py-1 rounded-[4px] bg-fog flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-ink" />
                    <span>Failed</span>
                  </span>
                ) : isActive ? (
                  <span className="font-mono text-sm font-semibold text-ink">
                    {item.progress}%
                  </span>
                ) : (
                  <span className="text-caption text-stone uppercase font-sans">
                    Ready in queue
                  </span>
                )}
              </div>
            </div>

            {/* Monochrome Progress Bar */}
            {isActive && (
              <div className="mt-4 space-y-2">
                <div className="w-full h-2 rounded-[4px] bg-stone/20 overflow-hidden">
                  <motion.div
                    className="h-full bg-ink rounded-[4px]"
                    style={{ width: `${item.progress}%` }}
                    transition={{ ease: "easeOut", duration: 0.15 }}
                  />
                </div>

                {/* Transfer Metrics */}
                <div className="flex items-center justify-between text-caption text-graphite font-sans pt-1">
                  <span>
                    {formatBytes(item.bytesTransferred || 0)} / {formatBytes(item.size)}
                  </span>

                  <div className="flex items-center gap-4">
                    {item.speed !== undefined && item.speed > 0 && (
                      <span className="text-ink font-mono">{formatSpeed(item.speed)}</span>
                    )}
                    {item.timeRemaining !== undefined && item.timeRemaining > 0 && (
                      <span className="text-stone">
                        ~{formatDuration(item.timeRemaining)} remaining
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Direct Download Button with Background for Receiver */}
            {isCompleted && item.blobUrl && (
              <div className="mt-4 pt-4 border-t border-hairline flex items-center justify-between">
                <span className="text-caption text-graphite font-sans">
                  File received & downloaded automatically.
                </span>
                <a
                  href={item.blobUrl}
                  download={item.name}
                  onClick={() => sounds.click()}
                  className="px-4 py-2 bg-ink text-paper text-caption font-sans uppercase tracking-widest rounded-[4px] hover:bg-stone hover:text-ink transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>Download Again</span>
                </a>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};
