"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ConnectionState, DeviceInfo, FileItem } from "@/types";
import { getDeviceInfo } from "@/lib/device";
import { PeerManager } from "@/lib/peer-manager";
import { FileTransferEngine, TransferProgressPayload } from "@/lib/file-transfer";
import { sounds } from "@/lib/audio";

// Generate clean 5-character code (alphanumeric excluding ambiguous 0/O, 1/I)
function generateRoomCode(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function useRoom() {
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [roomCode, setRoomCode] = useState<string>("");
  const [role, setRole] = useState<"sender" | "receiver" | null>(null);
  const [localDevice, setLocalDevice] = useState<DeviceInfo>({
    browser: "Browser",
    os: "Device",
    deviceType: "desktop",
    deviceName: "Local Client",
  });
  const [remoteDevice, setRemoteDevice] = useState<DeviceInfo | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMockMode, setIsMockMode] = useState<boolean>(false);

  // References to long-lived engine instances
  const peerManagerRef = useRef<PeerManager | null>(null);
  const transferEngineRef = useRef<FileTransferEngine | null>(null);

  // Initialize device info on client mount
  useEffect(() => {
    setLocalDevice(getDeviceInfo());
  }, []);

  // Ensure transfer engine is instantiated
  if (!transferEngineRef.current) {
    transferEngineRef.current = new FileTransferEngine();
  }

  // Cleanup helper
  const cleanupConnections = useCallback(() => {
    if (peerManagerRef.current) {
      peerManagerRef.current.destroy();
      peerManagerRef.current = null;
    }
    if (transferEngineRef.current) {
      transferEngineRef.current.reset();
    }
  }, []);

  // Reset to landing
  const resetToLanding = useCallback(() => {
    cleanupConnections();
    setConnectionState("idle");
    setRoomCode("");
    setRole(null);
    setRemoteDevice(null);
    setFiles([]);
    setActiveFileId(null);
    setErrorMessage(null);
  }, [cleanupConnections]);

  // Host: Create Drop
  const createRoom = useCallback(async () => {
    const code = generateRoomCode();
    setRoomCode(code);
    setRole("sender");
    setErrorMessage(null);

    if (isMockMode) {
      setConnectionState("waiting");
      return;
    }

    cleanupConnections();
    setConnectionState("waiting");
    sounds.click();

    const devInfo = getDeviceInfo();

    const manager = new PeerManager(devInfo, {
      onPeerOpen: () => {
        console.log("[useRoom] Room ready with code:", code);
        setConnectionState("waiting");
      },
      onConnectionEstablished: (remoteInfo) => {
        console.log("[useRoom] Peer connected:", remoteInfo);
        if (remoteInfo) setRemoteDevice(remoteInfo);
        setConnectionState("connected");
        sounds.connected();
      },
      onConnectionClosed: () => {
        console.log("[useRoom] Connection closed");
        setConnectionState("disconnected");
      },
      onDataReceived: (data) => {
        transferEngineRef.current?.handleIncomingData(
          data,
          (incomingItem) => {
            setConnectionState("transferring");
            setFiles((prev) => [...prev, incomingItem]);
            setActiveFileId(incomingItem.id);
          },
          (progressPayload) => {
            updateFileProgress(progressPayload);
          },
          (completedItem, blob, blobUrl) => {
            setFiles((prev) =>
              prev.map((f) => (f.id === completedItem.id ? { ...f, ...completedItem } : f))
            );
            setConnectionState("completed");
          },
          (error) => {
            setErrorMessage(error);
          }
        );
      },
      onError: (err) => {
        console.warn("[useRoom] Host error:", err);
        setErrorMessage(err);
      },
    });

    peerManagerRef.current = manager;
    await manager.createRoom(code);
  }, [cleanupConnections, isMockMode]);

  // Guest: Join Drop
  const joinRoom = useCallback(
    async (code: string) => {
      const formattedCode = code.toUpperCase().trim();
      if (!formattedCode || formattedCode.length !== 5) {
        setErrorMessage("Please enter a valid 5-character room code.");
        return;
      }

      setRoomCode(formattedCode);
      setRole("receiver");
      setErrorMessage(null);

      if (isMockMode) {
        setConnectionState("connected");
        setRemoteDevice({
          browser: "Chrome",
          os: "macOS",
          deviceType: "desktop",
          deviceName: "Chrome on macOS",
        });
        return;
      }

      cleanupConnections();
      setConnectionState("connecting");
      sounds.click();

      const devInfo = getDeviceInfo();

      const manager = new PeerManager(devInfo, {
        onPeerOpen: () => {
          console.log("[useRoom Guest] Connecting to code:", formattedCode);
        },
        onConnectionEstablished: (remoteInfo) => {
          console.log("[useRoom Guest] Connected to host:", remoteInfo);
          if (remoteInfo) setRemoteDevice(remoteInfo);
          setConnectionState("connected");
          sounds.connected();
        },
        onConnectionClosed: () => {
          console.log("[useRoom Guest] Connection closed");
          setConnectionState("disconnected");
        },
        onDataReceived: (data) => {
          transferEngineRef.current?.handleIncomingData(
            data,
            (incomingItem) => {
              setConnectionState("transferring");
              setFiles((prev) => [...prev, incomingItem]);
              setActiveFileId(incomingItem.id);
            },
            (progressPayload) => {
              updateFileProgress(progressPayload);
            },
            (completedItem, blob, blobUrl) => {
              setFiles((prev) =>
                prev.map((f) => (f.id === completedItem.id ? { ...f, ...completedItem } : f))
              );
              setConnectionState("completed");
            },
            (error) => {
              setErrorMessage(error);
            }
          );
        },
        onError: (err) => {
          console.warn("[useRoom Guest] Error:", err);
          setErrorMessage(err);
          setConnectionState("failed");
        },
      });

      peerManagerRef.current = manager;
      await manager.joinRoom(formattedCode);
    },
    [cleanupConnections, isMockMode]
  );

  // Update progress helper
  const updateFileProgress = (payload: TransferProgressPayload) => {
    setFiles((prev) =>
      prev.map((item) => {
        if (item.id === payload.fileId) {
          return {
            ...item,
            progress: payload.progress,
            bytesTransferred: payload.bytesTransferred,
            speed: payload.speed,
            timeRemaining: payload.timeRemaining,
            status: payload.progress >= 100 ? "completed" : "transferring",
          };
        }
        return item;
      })
    );
  };

  // Add files to transfer queue
  const addFiles = useCallback((incomingFiles: FileList | File[]) => {
    const fileArray = Array.from(incomingFiles);
    const newItems: FileItem[] = fileArray.map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      name: file.name,
      size: file.size,
      type: file.type || "application/octet-stream",
      file,
      progress: 0,
      status: "pending",
      bytesTransferred: 0,
    }));

    setFiles((prev) => [...prev, ...newItems]);
  }, []);

  // Send queued files sequentially
  const sendQueuedFiles = useCallback(async () => {
    const pending = files.filter((f) => f.status === "pending");
    if (pending.length === 0) return;

    if (isMockMode) {
      setConnectionState("transferring");
      for (const item of pending) {
        setActiveFileId(item.id);
        for (let p = 0; p <= 100; p += 10) {
          await new Promise((r) => setTimeout(r, 120));
          updateFileProgress({
            fileId: item.id,
            bytesTransferred: Math.round((item.size * p) / 100),
            totalBytes: item.size,
            progress: p,
            speed: 12.4 * 1024 * 1024,
            timeRemaining: ((100 - p) / 10) * 0.1,
          });
        }
      }
      sounds.complete();
      setConnectionState("completed");
      return;
    }

    if (!peerManagerRef.current || !peerManagerRef.current.isConnected()) {
      setErrorMessage("Connection is not ready. Please wait for peer.");
      return;
    }

    setConnectionState("transferring");

    for (const item of pending) {
      setActiveFileId(item.id);
      try {
        await transferEngineRef.current?.sendFile(
          item,
          (data) => peerManagerRef.current?.send(data) || false,
          () => peerManagerRef.current?.getBufferedAmount() || 0,
          (progressPayload) => updateFileProgress(progressPayload),
          (completedId) => {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === completedId ? { ...f, status: "completed", progress: 100 } : f
              )
            );
          },
          (failedId, err) => {
            setFiles((prev) =>
              prev.map((f) => (f.id === failedId ? { ...f, status: "error", error: err } : f))
            );
            setErrorMessage(err);
          }
        );
      } catch (err) {
        console.error("[useRoom] Error sending file:", err);
      }
    }

    setConnectionState("completed");
  }, [files, isMockMode]);

  // Cancel active transfer
  const cancelTransfer = useCallback(() => {
    transferEngineRef.current?.cancelTransfer();
    setConnectionState("connected");
  }, []);

  // Demo Mock State Switcher for UI review
  const setMockState = useCallback((state: ConnectionState) => {
    setIsMockMode(true);
    setConnectionState(state);
    if (state === "waiting") {
      setRoomCode("7XK9P");
      setRole("sender");
    } else if (state === "connecting" || state === "connected" || state === "transferring" || state === "completed") {
      setRoomCode("7XK9P");
      setRemoteDevice({
        browser: "Chrome",
        os: "macOS",
        deviceType: "desktop",
        deviceName: "Chrome on macOS",
      });
      if (state === "transferring" || state === "completed") {
        setFiles([
          {
            id: "mock-1",
            name: "design_system_v2.fig",
            size: 128 * 1024 * 1024,
            type: "application/octet-stream",
            progress: state === "completed" ? 100 : 67,
            status: state === "completed" ? "completed" : "transferring",
            speed: 18.5 * 1024 * 1024,
            bytesTransferred: state === "completed" ? 128 * 1024 * 1024 : 85 * 1024 * 1024,
            timeRemaining: 2.3,
          },
          {
            id: "mock-2",
            name: "photo_raw_4k.jpg",
            size: 14.2 * 1024 * 1024,
            type: "image/jpeg",
            progress: state === "completed" ? 100 : 0,
            status: state === "completed" ? "completed" : "pending",
            bytesTransferred: state === "completed" ? 14.2 * 1024 * 1024 : 0,
          },
        ]);
      }
    } else if (state === "failed" || state === "expired") {
      setErrorMessage(state === "expired" ? "This Drop has expired. Create a new one." : "Couldn't connect to device.");
    }
  }, []);

  return {
    connectionState,
    setConnectionState,
    roomCode,
    role,
    localDevice,
    remoteDevice,
    files,
    activeFileId,
    errorMessage,
    isMockMode,
    setIsMockMode,
    createRoom,
    joinRoom,
    addFiles,
    sendQueuedFiles,
    cancelTransfer,
    resetToLanding,
    setMockState,
  };
}
