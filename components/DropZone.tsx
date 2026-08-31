"use client";

import React, { useState, useRef } from "react";
import { Upload, Plus } from "lucide-react";
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
      e.target.value = "";
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`w-full rounded-[4px] border-hairline-dashed p-8 sm:p-14 transition-all cursor-pointer flex flex-col items-center justify-center text-center select-none ${
        isDragOver ? "bg-fog border-ink" : "bg-paper hover:bg-fog/50"
      } ${disabled ? "opacity-40 pointer-events-none" : ""}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleInputChange}
        className="hidden"
      />

      <div className="space-y-4 max-w-sm flex flex-col items-center">
        <div className="w-12 h-12 rounded-[4px] bg-fog border-hairline flex items-center justify-center text-ink">
          <Upload className="w-5 h-5" />
        </div>

        <div className="space-y-1">
          <p className="eyebrow-tag">
            {isDragOver ? "RELEASE TO DROP FILES" : "DRAG & DROP ZONE"}
          </p>

          <h3 className="font-editorial text-2xl sm:text-3xl text-ink font-normal">
            Drop your files here
          </h3>

          <p className="text-caption text-graphite font-sans">
            Transfer photos, videos, archives, or documents of any size
          </p>
        </div>

        {/* Clear Browse Button CTA with Background */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
          className="px-6 py-2.5 bg-ink text-paper text-caption font-sans uppercase tracking-widest rounded-[4px] hover:bg-stone hover:text-ink transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95 mt-2"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Or Browse Files</span>
        </button>
      </div>
    </div>
  );
};
