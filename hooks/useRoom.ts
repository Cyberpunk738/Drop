"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { ConnectionState, DeviceInfo, FileItem } from "@/types";
import { getDeviceInfo } from "@/lib/device";
import { PeerManager } from "@/lib/peer-manager";
import {
  FileTransferEngine,
  MAX_FILE_SIZE,
  TransferProgressPayload,
} from "@/lib/file-transfer";

function generateRoomCode() {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  return Array.from(
    crypto.getRandomValues(new Uint8Array(5)),
    (n) => chars[n % chars.length],
  ).join("");
}
export function useRoom() {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("idle");
  const [roomCode, setRoomCode] = useState("");
  const [role, setRole] = useState<"sender" | "receiver" | null>(null);
  const [localDevice, setLocalDevice] = useState<DeviceInfo>({
    browser: "Browser",
    os: "Device",
    deviceType: "desktop",
    deviceName: "This device",
  });
  const [remoteDevice, setRemoteDevice] = useState<DeviceInfo | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const peer = useRef<PeerManager | null>(null);
  const engine = useRef<FileTransferEngine | null>(null);
  const sending = useRef(false);
  const cancelled = useRef(false);
  const epoch = useRef(0);
  if (!engine.current) engine.current = new FileTransferEngine();
  useEffect(() => {
    setLocalDevice(getDeviceInfo());
    return () => {
      epoch.current++;
      peer.current?.destroy();
      engine.current?.reset();
    };
  }, []);
  const updateProgress = (p: TransferProgressPayload) =>
    setFiles((prev) =>
      prev.map((f) =>
        f.id === p.fileId ? { ...f, ...p, status: "transferring" } : f,
      ),
    );
  const connect = useCallback(async (code: string, host: boolean) => {
    const session = ++epoch.current;
    peer.current?.destroy();
    engine.current?.reset();
    sending.current = false;
    cancelled.current = false;
    setFiles([]);
    setErrorMessage(null);
    setRemoteDevice(null);
    setActiveFileId(null);
    setRoomCode(code);
    setRole(host ? "sender" : "receiver");
    setConnectionState(host ? "creating" : "connecting");
    const current = () => epoch.current === session;
    const manager = new PeerManager(getDeviceInfo(), {
      onPeerOpen: () => {
        if (current() && host) setConnectionState("waiting");
      },
      onConnectionEstablished: (info) => {
        if (current()) {
          setRemoteDevice(info || null);
          setErrorMessage(null);
          setConnectionState("connected");
        }
      },
      onConnectionClosed: () => {
        if (!current()) return;
        cancelled.current = true;
        engine.current?.cancelTransfer();
        setFiles((prev) =>
          prev.map((f) =>
            f.status === "transferring"
              ? {
                  ...f,
                  status: "error",
                  error: "Connection lost. Reconnect and retry.",
                }
              : f,
          ),
        );
        setConnectionState("disconnected");
      },
      onError: (message) => {
        if (current()) {
          setErrorMessage(message);
          setConnectionState("failed");
        }
      },
      onDataReceived: (data) => {
        if (!current()) return;
        void engine.current?.handleIncomingData(
          data as ArrayBuffer | string,
          (item) => {
            if (current()) {
              setFiles((prev) => [
                ...prev.filter((f) => f.id !== item.id),
                item,
              ]);
              setActiveFileId(item.id);
              setConnectionState("transferring");
            }
          },
          (p) => {
            if (current()) updateProgress(p);
          },
          (item) => {
            if (current()) {
              setFiles((prev) =>
                prev.map((f) => (f.id === item.id ? item : f)),
              );
              setActiveFileId(null);
              if (!sending.current) setConnectionState("connected");
            }
          },
          (message) => {
            if (current()) {
              setErrorMessage(message);
              setFiles((prev) =>
                prev.map((f) =>
                  !f.file && f.status === "transferring"
                    ? { ...f, status: "error", error: message }
                    : f,
                ),
              );
              if (!sending.current) setConnectionState("connected");
            }
          },
          (data) => manager.send(data),
        );
      },
    });
    peer.current = manager;
    try {
      if (host) await manager.createRoom(code);
      else await manager.joinRoom(code);
    } catch (e) {
      if (current()) {
        setErrorMessage(e instanceof Error ? e.message : "Could not connect.");
        setConnectionState("failed");
      }
    }
  }, []);
  const createRoom = useCallback(
    () => connect(generateRoomCode(), true),
    [connect],
  );
  const joinRoom = useCallback(
    (code: string) => {
      code = code.trim().toUpperCase();
      if (!/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{5}$/.test(code)) {
        setErrorMessage(
          "Enter the 5-character code shown on the other device.",
        );
        return;
      }
      return connect(code, false);
    },
    [connect],
  );
  const resetToLanding = useCallback(() => {
    epoch.current++;
    cancelled.current = true;
    sending.current = false;
    peer.current?.destroy();
    peer.current = null;
    engine.current?.reset();
    setConnectionState("idle");
    setRoomCode("");
    setRole(null);
    setRemoteDevice(null);
    setFiles([]);
    setActiveFileId(null);
    setErrorMessage(null);
  }, []);
  const addFiles = useCallback((incoming: FileList | File[]) => {
    const selected = Array.from(incoming);
    if (selected.some((f) => f.size > MAX_FILE_SIZE))
      setErrorMessage(
        "Files must be 100 MB or smaller to keep browser memory use bounded.",
      );
    else setErrorMessage(null);
    setFiles((prev) => [
      ...prev,
      ...selected
        .filter((f) => f.size <= MAX_FILE_SIZE)
        .map((file) => ({
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          type: file.type,
          file,
          progress: 0,
          status: "pending" as const,
          bytesTransferred: 0,
        })),
    ]);
  }, []);
  const sendQueuedFiles = useCallback(async () => {
    if (sending.current || !peer.current?.isConnected()) return;
    const pending = files.filter(
      (f) =>
        f.file &&
        (f.status === "pending" ||
          f.status === "error" ||
          f.status === "cancelled"),
    );
    if (!pending.length) return;
    const session = epoch.current;
    sending.current = true;
    cancelled.current = false;
    setErrorMessage(null);
    setConnectionState("transferring");
    for (const item of pending) {
      if (cancelled.current || session !== epoch.current) break;
      setActiveFileId(item.id);
      const ok = await engine.current!.sendFile(
        item,
        (data) =>
          session === epoch.current && (peer.current?.send(data) || false),
        () => peer.current?.getBufferedAmount() || 0,
        (p) => {
          if (session === epoch.current) updateProgress(p);
        },
        (id) => {
          if (session === epoch.current)
            setFiles((prev) =>
              prev.map((f) =>
                f.id === id ? { ...f, progress: 100, status: "completed" } : f,
              ),
            );
        },
        (id, message) => {
          if (session === epoch.current) {
            setErrorMessage(message);
            setFiles((prev) =>
              prev.map((f) =>
                f.id === id
                  ? {
                      ...f,
                      status: cancelled.current ? "cancelled" : "error",
                      error: message,
                    }
                  : f,
              ),
            );
          }
        },
      );
      if (!ok) break;
    }
    if (session !== epoch.current) return;
    sending.current = false;
    setActiveFileId(null);
    if (peer.current?.isConnected()) setConnectionState("connected");
  }, [files]);
  const cancelTransfer = useCallback(() => {
    cancelled.current = true;
    engine.current?.cancelTransfer();
    setFiles((prev) =>
      prev.map((f) =>
        !f.file && f.status === "transferring"
          ? { ...f, status: "cancelled", error: "Transfer cancelled." }
          : f,
      ),
    );
    if (!sending.current) {
      setActiveFileId(null);
      setConnectionState("connected");
    }
  }, []);

  return {
    connectionState,
    roomCode,
    role,
    localDevice,
    remoteDevice,
    files,
    activeFileId,
    errorMessage,
    createRoom,
    joinRoom,
    addFiles,
    sendQueuedFiles,
    cancelTransfer,
    resetToLanding,
    removeFile: (id: string) =>
      setFiles((prev) =>
        prev.filter((f) => f.id !== id || f.status === "transferring"),
      ),
  };
}
