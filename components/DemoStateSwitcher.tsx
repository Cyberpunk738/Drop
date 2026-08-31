"use client";

import React, { useState, useEffect, useRef } from "react";
import { ConnectionState } from "@/types";
import { sounds } from "@/lib/audio";

interface DemoStateSwitcherProps {
  currentState: ConnectionState;
  isMockMode: boolean;
  onSetState: (state: ConnectionState) => void;
  onResetLive: () => void;
}

export const DemoStateSwitcher: React.FC<DemoStateSwitcherProps> = ({
  currentState,
  onSetState,
  onResetLive,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const states: { label: string; state: ConnectionState }[] = [
    { label: "1. Landing", state: "idle" },
    { label: "2. Room Ready (QR)", state: "waiting" },
    { label: "3. Connecting", state: "connecting" },
    { label: "4. Connected (Dropzone)", state: "connected" },
    { label: "5. Transferring (67%)", state: "transferring" },
    { label: "6. Completed (Success)", state: "completed" },
    { label: "7. Disconnected", state: "disconnected" },
    { label: "8. Expired Room", state: "expired" },
  ];

  return (
    <div ref={containerRef} className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
      {/* Expanded States Menu */}
      {isOpen && (
        <div className="mb-2 p-4 rounded-[4px] bg-paper border-hairline shadow-2xl flex flex-col gap-2 w-72 bg-white animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="text-left pb-2 border-b border-hairline flex items-center justify-between">
            <span className="eyebrow-tag text-[10px]">
              UI PREVIEW STATES
            </span>
            <button
              onClick={() => {
                sounds.click();
                onResetLive();
                setIsOpen(false);
              }}
              className="text-[10px] font-sans text-ink uppercase tracking-wider hover:text-stone underline underline-offset-2"
            >
              Live WebRTC →
            </button>
          </div>

          <div className="grid grid-cols-1 gap-1.5 max-h-60 overflow-y-auto py-1">
            {states.map((item) => {
              const isSelected = currentState === item.state;
              return (
                <button
                  key={item.state}
                  onClick={() => {
                    sounds.click();
                    onSetState(item.state);
                    setIsOpen(false);
                  }}
                  className={`px-3 py-2 text-left rounded-[4px] text-[11px] font-sans uppercase tracking-wider transition-colors ${
                    isSelected
                      ? "bg-ink text-paper font-medium"
                      : "bg-fog text-ink hover:bg-stone hover:text-paper"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Trigger Pill at Bottom-Right to Avoid Overlapping Content */}
      <button
        onClick={() => {
          sounds.click();
          setIsOpen(!isOpen);
        }}
        className="px-3.5 py-2 rounded-[4px] bg-paper border-hairline hover:border-ink text-caption uppercase text-ink tracking-widest transition-all shadow-md bg-white flex items-center gap-2 cursor-pointer active:scale-95"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-ink" />
        <span>Preview [{currentState.toUpperCase()}]</span>
        <span className="text-stone text-[10px]">{isOpen ? "✕" : "▲"}</span>
      </button>
    </div>
  );
};
