"use client";

import React from "react";
import { ConnectionState, DeviceInfo } from "@/types";

interface NavbarProps {
  connectionState: ConnectionState;
  localDevice: DeviceInfo;
  remoteDevice: DeviceInfo | null;
  onReset: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  connectionState,
  localDevice,
  remoteDevice,
  onReset,
}) => {
  const getStatusLabel = () => {
    switch (connectionState) {
      case "idle":
        return "READY — ZERO STORAGE";
      case "creating":
      case "waiting":
        return "WAITING FOR PEER";
      case "connecting":
        return "WEBRTC HANDSHAKE";
      case "connected":
        return "DIRECT P2P LINK ACTIVE";
      case "transferring":
        return "STREAMING CHUNKS";
      case "completed":
        return "TRANSFER COMPLETE";
      case "disconnected":
        return "PEER DISCONNECTED";
      case "failed":
      case "expired":
        return "SESSION EXPIRED";
      default:
        return "P2P ENCRYPTED";
    }
  };

  return (
    <header className="w-full bg-paper border-b border-hairline sticky top-0 z-40">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-12 h-20 flex items-center justify-between">
        {/* Left: Wordmark */}
        <button
          onClick={onReset}
          className="flex items-baseline gap-2.5 text-left focus:outline-none group"
        >
          <span className="font-editorial text-2xl sm:text-3xl text-ink tracking-tight font-normal">
            DROP
          </span>
          <span className="text-stone text-[12px] uppercase font-sans tracking-widest hidden sm:inline">
            — P2P
          </span>
        </button>

        {/* Center: Quiet Status Eyebrow */}
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-ink inline-block" />
          <span className="eyebrow-tag text-[11px] sm:text-[12px]">
            {getStatusLabel()}
          </span>
        </div>

        {/* Right: Device & Soft Action */}
        <div className="flex items-center gap-6">
          <div className="text-caption text-graphite hidden md:block">
            {localDevice.browser} <span className="text-stone">—</span> {localDevice.os}
          </div>

          {connectionState !== "idle" && (
            <button
              onClick={onReset}
              className="text-caption uppercase text-ink hover:text-stone transition-colors underline underline-offset-4 tracking-wider"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
