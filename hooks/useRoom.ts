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

const waitingToSend =
  "Waiting for the other device. Your files are still queued.";

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
  const [sendInProgress, setSendInProgress] = useState(false);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const peer = useRef<PeerManager | null>(null);
  const engine = useRef<FileTransferEngine | null>(null);
  const sending = useRef(false);
  const receiving = useRef(false);
  const channelEpoch = useRef(0);
  const cancelled = useRef(false);
  const epoch = useRef(0);
  if (!engine.current) engine.current = new FileTransferEngine();
  useEffect(() => {
    setLocalDevice(getDeviceInfo());
    const resume = () => {
      if (!document.hidden) peer.current?.reconnect();
    };
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("pageshow", resume);
    window.addEventListener("focus", resume);
    window.addEventListener("online", resume);
    return () => {
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("pageshow", resume);
      window.removeEventListener("focus", resume);
      window.removeEventListener("online", resume);
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
    engine.current = new FileTransferEngine();
    sending.current = false;
    setSendInProgress(false);
    receiving.current = false;
    cancelled.current = false;
    setFiles([]);
    setErrorMessage(null);
    setRemoteDevice(null);
    setActiveFileId(null);
    setRoomCode(code);
    setRole(host ? "sender" : "receiver");
    setConnectionState(host ? "creating" : "connecting");
    const current = () => epoch.current === session;
    const handleConnectionLoss = (ended: boolean) => {
      if (!current()) return;
      channelEpoch.current++;
      cancelled.current = true;
      receiving.current = false;
      engine.current?.interruptTransfer();
      setActiveFileId(null);
      setFiles((prev) =>
        prev.map((f) =>
          f.status === "transferring"
            ? {
                ...f,
                status: "error",
                error: ended
                  ? "The other device ended the session."
                  : "Connection lost. Retry after both devices reconnect.",
              }
            : f,
        ),
      );
      setConnectionState(ended ? "disconnected" : "reconnecting");
    };
    const manager = new PeerManager(getDeviceInfo(), {
      onPeerOpen: () => {
        if (current() && host) setConnectionState("waiting");
      },
      onConnectionEstablished: (info) => {
        if (current()) {
          if (info) setRemoteDevice(info);
          setErrorMessage((message) =>
            message === waitingToSend ? null : message,
          );
          setConnectionState("connected");
        }
      },
      onRemoteDevice: (info) => {
        if (current()) setRemoteDevice(info);
      },
      onConnectionLost: () => handleConnectionLoss(false),
      onSessionEnded: () => handleConnectionLoss(true),
      onError: (message) => {
        if (current()) {
          setErrorMessage(message);
          setConnectionState("failed");
        }
      },
      onDataReceived: (data) => {
        if (!current()) return;
        void engine.current?.handleIncomingData(
          data,
          (item) => {
            if (current()) {
              setFiles((prev) => [
                ...prev.filter((f) => f.id !== item.id),
                item,
              ]);
              receiving.current = true;
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
              receiving.current = false;
              setActiveFileId(null);
              if (!sending.current || cancelled.current)
                setConnectionState("connected");
            }
          },
          (message) => {
            if (current()) {
              receiving.current = false;
              setActiveFileId(null);
              setErrorMessage(message);
              setFiles((prev) =>
                prev.map((f) =>
                  !f.file && f.status === "transferring"
                    ? { ...f, status: "error", error: message }
                    : f,
                ),
              );
              if (!sending.current || cancelled.current)
                setConnectionState("connected");
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
    setSendInProgress(false);
    receiving.current = false;
    peer.current?.endSession();
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
  const reconnectRoom = useCallback(() => peer.current?.reconnect(), []);
  const sendQueuedFiles = useCallback(async () => {
    const manager = peer.current;
    if (!manager?.isConnected()) {
      setErrorMessage(waitingToSend);
      manager?.reconnect();
      return;
    }
    if (sending.current) return;

    const pending = files.filter(
      (f) =>
        f.file &&
        (f.status === "pending" ||
          f.status === "error" ||
          f.status === "cancelled"),
    );
    if (!pending.length) return;
    const session = epoch.current;
    const channel = channelEpoch.current;
    const current = () =>
      epoch.current === session && channelEpoch.current === channel;
    const transferEngine = engine.current!;
    sending.current = true;
    setSendInProgress(true);
    cancelled.current = false;
    setErrorMessage(null);
    setConnectionState("transferring");
    for (const item of pending) {
      if (cancelled.current || !current()) break;
      setActiveFileId(item.id);
      setFiles((prev) =>
        prev.map((f) =>
          f.id === item.id
            ? { ...f, progress: 0, status: "transferring", error: undefined }
            : f,
        ),
      );
      const ok = await transferEngine.sendFile(
        item,
        (data) => current() && manager.send(data),
        () => manager.getBufferedAmount(),
        (p) => {
          if (current()) updateProgress(p);
        },
        (id) => {
          if (current())
            setFiles((prev) =>
              prev.map((f) =>
                f.id === id ? { ...f, progress: 100, status: "completed" } : f,
              ),
            );
        },
        (id, message) => {
          if (current()) {
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
    setSendInProgress(false);
    if (current() && !receiving.current) {
      setActiveFileId(null);
      if (manager.isConnected()) setConnectionState("connected");
    }
  }, [files]);
  const cancelTransfer = useCallback(() => {
    cancelled.current = true;
    engine.current?.cancelTransfer();
    receiving.current = false;
    setFiles((prev) =>
      prev.map((f) =>
        !f.file && f.status === "transferring"
          ? { ...f, status: "cancelled", error: "Transfer cancelled." }
          : f,
      ),
    );
    if (!sending.current) {
      setActiveFileId(null);
      if (peer.current?.isConnected()) setConnectionState("connected");
    }
  }, []);

  return {
    connectionState,
    roomCode,
    role,
    localDevice,
    remoteDevice,
    files,
    sendInProgress,
    activeFileId,
    errorMessage,
    createRoom,
    joinRoom,
    addFiles,
    sendQueuedFiles,
    reconnectRoom,
    cancelTransfer,
    resetToLanding,
    removeFile: (id: string) =>
      setFiles((prev) =>
        prev.filter((f) => f.id !== id || f.status === "transferring"),
      ),
  };
}
