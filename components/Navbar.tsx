"use client";
import { ArrowUpRight, Radio } from "lucide-react";
import { ConnectionState, DeviceInfo } from "@/types";
interface Props {
  connectionState: ConnectionState;
  localDevice: DeviceInfo;
  remoteDevice: DeviceInfo | null;
  onReset: () => void;
}
export function Navbar({ connectionState: state, onReset }: Props) {
  const label = {
    idle: "Ready when you are",
    creating: "Creating your Drop…",
    waiting: "Waiting for your device",
    connecting: "Connecting devices…",
    connected: "Devices connected",
    transferring: "Transfer in progress",
    completed: "Delivery verified",
    disconnected: "Device disconnected",
    reconnecting: "Reconnecting…",
    failed: "Could not connect",
    expired: "Session ended",
  }[state];
  return (
    <header className="nav-wrap">
      <nav className="main-nav" aria-label="Main navigation">
        <button className="wordmark" onClick={onReset} aria-label="Drop home">
          <span className="brand-symbol">
            <ArrowUpRight size={19} />
          </span>
          drop<span className="brand-reg">®</span>
        </button>
        <div className="nav-links">
          <a href="/#how-it-works">How it works</a>
          <span>Private by design</span>
        </div>
        <span className="nav-status" role="status">
          <Radio size={13} />
          {label}
        </span>
      </nav>
    </header>
  );
}
