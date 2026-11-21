"use client";
import React, { useRef } from "react";
import { DeviceInfo, FileItem, ConnectionState } from "@/types";
import { DropZone } from "./DropZone";
import { ArrowUpRight, Check, Download, File, Loader2, X } from "lucide-react";
import { formatBytes, formatSpeed, formatDuration } from "@/lib/device";
interface Props {
  connectionState: ConnectionState;
  remoteDevice: DeviceInfo | null;
  files: FileItem[];
  sendInProgress: boolean;
  activeFileId: string | null;
  role: "sender" | "receiver" | null;
  errorMessage: string | null;
  onFilesSelected: (files: FileList | File[]) => void;
  onSendFiles: () => void;
  onReconnect: () => void;
  onCancelTransfer: () => void;
  onLeave: () => void;
  onRemoveFile: (id: string) => void;
}
export function TransferView(p: Props) {
  const picker = useRef<HTMLInputElement>(null);
  const busy = p.connectionState === "transferring";
  const disconnected = p.connectionState === "disconnected";
  const reconnecting = p.connectionState === "reconnecting";
  const canSend = p.connectionState === "connected" && !p.sendInProgress;
  const ready = p.files.filter(
    (f) => f.file && ["pending", "error", "cancelled"].includes(f.status),
  );
  const retrying = ready.some((f) => f.status !== "pending");
  return (
    <section className="session-shell">
      <div className="session-heading">
        <span className="section-label">
          {disconnected ? "Session ended" : "Your private connection"}
        </span>
        <h1>
          {disconnected
            ? "The other device ended this Drop."
            : reconnecting
              ? "Reconnecting…"
              : `Connected to ${p.remoteDevice?.deviceName || "your other device"}.`}
        </h1>
        <p>
          {disconnected
            ? "Start a new Drop to send more files."
            : reconnecting
              ? "Keep both devices on Drop. Your selected files will be ready when the connection returns."
              : "Choose a file, then tap Send. Keep both devices on Drop until delivery is confirmed."}
        </p>
        <button className="text-action" onClick={p.onLeave}>
          {disconnected ? "Start a new Drop" : "End session"}{" "}
          <ArrowUpRight size={15} />
        </button>
      </div>
      {p.errorMessage && (
        <p role="alert" className="error-notice">
          {p.errorMessage}
        </p>
      )}
      {!disconnected && (
        <div className="transfer-card">
          <DropZone onFilesSelected={p.onFilesSelected} disabled={busy} />
          <p className="limit-note">
            Up to 100 MB per file · Files stay in your browsers
          </p>
        </div>
      )}
      <input
        ref={picker}
        aria-label="Choose more files"
        type="file"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) p.onFilesSelected(e.target.files);
          e.target.value = "";
        }}
      />
      {p.files.length > 0 && (
        <div className="file-list">
          {p.files.map((f) => (
            <article key={f.id} className="file-row">
              <div className="file-icon">
                {f.status === "completed" ? (
                  <Check size={21} />
                ) : (
                  <File size={21} />
                )}
              </div>
              <div className="file-details">
                <strong>{f.name}</strong>
                <span>
                  {formatBytes(f.size)} ·{" "}
                  {f.status === "completed"
                    ? "Delivery verified"
                    : f.status === "transferring" && f.progress >= 99
                      ? "Verifying delivery…"
                      : f.status === "pending"
                        ? "Ready to send"
                        : f.status}
                </span>
                {f.status === "transferring" && (
                  <progress
                    aria-label={`Transfer progress for ${f.name}`}
                    max={100}
                    value={f.progress}
                  />
                )}
                {f.status === "transferring" &&
                  (f.speed || 0) > 0 &&
                  f.progress < 99 && (
                    <span>
                      {formatSpeed(f.speed || 0)} ·{" "}
                      {formatDuration(f.timeRemaining || 0)} remaining
                    </span>
                  )}
                {f.error && f.status !== "completed" && (
                  <span className="file-error">{f.error}</span>
                )}
              </div>
              {f.blobUrl && (
                <a
                  className="icon-action"
                  href={f.blobUrl}
                  download={f.name}
                  aria-label={`Download ${f.name}`}
                >
                  <Download size={19} />
                </a>
              )}
              {f.file && !busy && f.status !== "completed" && (
                <button
                  className="icon-action"
                  onClick={() => p.onRemoveFile(f.id)}
                  aria-label={`Remove ${f.name}`}
                >
                  <X size={18} />
                </button>
              )}
            </article>
          ))}
        </div>
      )}
      <div className="session-actions">
        {busy ? (
          <button className="button-secondary" onClick={p.onCancelTransfer}>
            <Loader2 className="animate-spin" size={16} /> Cancel transfer
          </button>
        ) : (
          !disconnected && (
            <>
              {reconnecting && p.role === "receiver" && (
                <button className="button-secondary" onClick={p.onReconnect}>
                  Retry connection
                </button>
              )}
              {ready.length > 0 && (
                <button
                  className="button-primary"
                  onClick={p.onSendFiles}
                  disabled={!canSend}
                >
                  {reconnecting
                    ? "Waiting to send"
                    : p.sendInProgress
                      ? "Finishing previous attempt…"
                      : `${retrying ? "Retry" : "Send"} ${ready.length} ${ready.length === 1 ? "file" : "files"}`}{" "}
                  <ArrowUpRight size={17} />
                </button>
              )}
              {p.files.length > 0 && (
                <button
                  className="button-secondary"
                  onClick={() => picker.current?.click()}
                >
                  Choose more files
                </button>
              )}
            </>
          )
        )}
      </div>
    </section>
  );
}
