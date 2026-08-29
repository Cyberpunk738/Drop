"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  FileText,
  FileArchive,
  Image as ImageIcon,
  Film,
  Music,
  Code2,
  CheckCircle2,
  XCircle,
  Download,
  Activity,
  Clock,
  Zap,
} from "lucide-react";
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
  onCancelTransfer,
}) => {
  const getFileIcon = (fileName: string, mimeType: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext) || mimeType.startsWith("image/")) {
      return <ImageIcon className="w-5 h-5 text-cyan-400" />;
    }
    if (["zip", "tar", "gz", "7z", "rar"].includes(ext) || mimeType.includes("zip")) {
      return <FileArchive className="w-5 h-5 text-amber-400" />;
    }
    if (["mp4", "webm", "mov", "mkv"].includes(ext) || mimeType.startsWith("video/")) {
      return <Film className="w-5 h-5 text-purple-400" />;
    }
    if (["mp3", "wav", "flac", "ogg"].includes(ext) || mimeType.startsWith("audio/")) {
      return <Music className="w-5 h-5 text-pink-400" />;
    }
    if (["ts", "tsx", "js", "jsx", "py", "json", "html", "css"].includes(ext)) {
      return <Code2 className="w-5 h-5 text-emerald-400" />;
    }
    return <FileText className="w-5 h-5 text-zinc-400" />;
  };

  return (
    <div className="w-full space-y-4">
      {files.map((item) => {
        const isActive = item.id === activeFileId || item.status === "transferring";
        const isCompleted = item.status === "completed";
        const isError = item.status === "error";

        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`glass-panel p-4 sm:p-5 rounded-2xl transition-all relative overflow-hidden ${
              isActive ? "border-cyan-500/30 bg-zinc-900/90 shadow-glow" : "bg-zinc-950/60"
            }`}
          >
            {/* Header info */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/5 flex-shrink-0">
                  {getFileIcon(item.name, item.type)}
                </div>
                <div className="min-w-0">
                  <p className="font-mono text-sm font-medium text-zinc-100 truncate">
                    {item.name}
                  </p>
                  <p className="font-mono text-xs text-zinc-400">
                    {formatBytes(item.size)}
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {isCompleted ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-700/50 text-xs font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Complete</span>
                  </div>
                ) : isError ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-950/60 text-rose-300 border border-rose-800/50 text-xs font-mono">
                    <XCircle className="w-3.5 h-3.5 text-rose-400" />
                    <span>Failed</span>
                  </div>
                ) : isActive ? (
                  <span className="font-mono text-sm font-bold text-cyan-400 text-glow">
                    {item.progress}%
                  </span>
                ) : (
                  <span className="text-xs font-mono text-zinc-500">Queued</span>
                )}
              </div>
            </div>

            {/* Live Progress Bar */}
            {isActive && (
              <div className="mt-4 space-y-2">
                <div className="w-full h-2 rounded-full bg-zinc-900 overflow-hidden border border-white/5 relative">
                  <motion.div
                    className="h-full bg-gradient-to-r from-cyan-400 via-brand-500 to-emerald-400 rounded-full"
                    style={{ width: `${item.progress}%` }}
                    transition={{ ease: "easeOut", duration: 0.15 }}
                  />
                </div>

                {/* Transfer Metrics */}
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-1">
                  <div className="flex items-center gap-1.5">
                    <span>
                      {formatBytes(item.bytesTransferred || 0)} / {formatBytes(item.size)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {item.speed !== undefined && item.speed > 0 && (
                      <div className="flex items-center gap-1 text-cyan-400">
                        <Zap className="w-3 h-3" />
                        <span>{formatSpeed(item.speed)}</span>
                      </div>
                    )}
                    {item.timeRemaining !== undefined && item.timeRemaining > 0 && (
                      <div className="flex items-center gap-1 text-zinc-400">
                        <Clock className="w-3 h-3" />
                        <span>~{formatDuration(item.timeRemaining)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Manual Download Button for Receiver if completed */}
            {isCompleted && item.blobUrl && (
              <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Downloaded automatically</span>
                </span>
                <a
                  href={item.blobUrl}
                  download={item.name}
                  onClick={() => sounds.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-900 border border-white/10 hover:border-emerald-500/40 text-xs font-mono text-zinc-200 hover:text-white transition-all active:scale-95"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Save Again</span>
                </a>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};
