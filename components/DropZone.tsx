"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, Plus, FileText, Sparkles } from "lucide-react";
import { sounds } from "@/lib/audio";

interface DropZoneProps {
  onFilesSelected: (files: FileList | File[]) => void;
  disabled?: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onFilesSelected,
  disabled = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      sounds.click();
      onFilesSelected(e.dataTransfer.files);
    }
  };

  const handleClick = () => {
    if (disabled) return;
    sounds.click();
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      sounds.click();
      onFilesSelected(e.target.files);
      // Reset input value so same file can be re-selected if desired
      e.target.value = "";
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`group relative w-full rounded-2xl border-2 border-dashed p-8 sm:p-12 transition-all cursor-pointer flex flex-col items-center justify-center text-center select-none ${
        isDragOver
          ? "border-cyan-400 bg-cyan-950/20 scale-[1.01] shadow-glow"
          : "border-white/10 hover:border-white/20 bg-zinc-950/40 hover:bg-zinc-950/60"
      } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleInputChange}
        className="hidden"
      />

      <div
        className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 ${
          isDragOver
            ? "bg-cyan-500/20 text-cyan-300 scale-110"
            : "bg-zinc-900 border border-white/5 text-zinc-400 group-hover:text-cyan-400 group-hover:scale-105"
        }`}
      >
        <UploadCloud className="w-8 h-8 transition-transform group-hover:-translate-y-0.5" />
      </div>

      <div className="space-y-1.5 max-w-xs">
        <p className="text-sm font-mono font-medium text-zinc-100 group-hover:text-cyan-300 transition-colors">
          {isDragOver ? "Drop files to transfer" : "Drop your files here"}
        </p>
        <p className="text-xs font-mono text-zinc-400">
          or <span className="text-cyan-400 underline underline-offset-4">click to browse</span>
        </p>
      </div>

      <div className="mt-4 flex items-center gap-2 text-[11px] font-mono text-zinc-400">
        <Sparkles className="w-3 h-3 text-emerald-400/80" />
        <span>Any format • Any size • Direct P2P</span>
      </div>
    </div>
  );
};
