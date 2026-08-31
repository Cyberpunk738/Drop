"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ConnectionState, DeviceInfo, FileItem, SignalingMessage } from "@/types";
import { getDeviceInfo } from "@/lib/device";
import { SignalingClient } from "@/lib/signaling";
import { WebRTCManager } from "@/lib/webrtc";
import { FileTransferEngine, TransferProgressPayload } from "@/lib/file-transfer";
import { sounds } from "@/lib/audio";

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

  // References to long-lived engine instances and mutable state
  const signalingRef = useRef<SignalingClient | null>(null);
  const webrtcRef = useRef<WebRTCManager | null>(null);
  const transferEngineRef = useRef<FileTransferEngine | null>(null);
  const activeRoomCodeRef = useRef<string>("");

  // Keep ref in sync
  useEffect(() => {
    activeRoomCodeRef.current = roomCode;
  }, [roomCode]);

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
    if (signalingRef.current) {
      signalingRef.current.disconnect();
      signalingRef.current = null;
    }
    if (webrtcRef.current) {
      webrtcRef.current.close();
      webrtcRef.current = null;
    }
    if (transferEngineRef.current) {
      transferEngineRef.current.reset();
    }
    activeRoomCodeRef.current = "";
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
  const createRoom = useCallback(() => {
    if (isMockMode) {
      setConnectionState("waiting");
      setRoomCode("7XK9P");
      activeRoomCodeRef.current = "7XK9P";
      setRole("sender");
      return;
    }

    cleanupConnections();
    setErrorMessage(null);
    setConnectionState("creating");
    setRole("sender");
    sounds.click();

    const devInfo = getDeviceInfo();
    const signaling = new SignalingClient();
    signalingRef.current = signaling;

    const webrtc = new WebRTCManager({
      onConnectionStateChange: (state) => {
        console.log("[useRoom] WebRTC state:", state);
        if (state === "connected") {
          setConnectionState("connected");
          signaling.stopPolling();
          sounds.connected();
        } else if (state === "disconnected" || state === "failed") {
          setConnectionState("disconnected");
        }
      },
      onDataChannelOpen: () => {
        setConnectionState("connected");
        signaling.stopPolling();
      },
      onDataChannelMessage: (data) => {
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
      onIceCandidate: (candidate) => {
        signaling.send({
          type: "ice-candidate",
          roomCode: activeRoomCodeRef.current,
          candidate: candidate.toJSON(),
        });
      },
    });
    webrtcRef.current = webrtc;

    signaling.connect({
      onOpen: () => {
        signaling.send({
          type: "create-room",
          peerInfo: devInfo,
        });
      },
      onMessage: async (msg: SignalingMessage) => {
        switch (msg.type) {
          case "room-created": {
            setRoomCode(msg.roomCode);
            activeRoomCodeRef.current = msg.roomCode;
            setConnectionState("waiting");
            break;
          }

          case "peer-joined": {
            setRemoteDevice(msg.peerInfo);
            setConnectionState("connecting");

            // Host creates WebRTC offer
            try {
              webrtc.initPeerConnection(true);
              const offer = await webrtc.createOffer();
              if (offer) {
                signaling.send({
                  type: "offer",
                  roomCode: activeRoomCodeRef.current,
                  sdp: offer,
                });
              }
            } catch (err) {
              console.error("[useRoom] Error initiating offer:", err);
              setErrorMessage("Failed to initiate direct peer connection.");
            }
            break;
          }

          case "answer": {
            try {
              await webrtc.handleAnswer(msg.sdp);
            } catch (err) {
              console.error("[useRoom] Error handling answer:", err);
            }
            break;
          }

          case "ice-candidate": {
            webrtc.addIceCandidate(msg.candidate);
            break;
          }

          case "peer-left": {
            setConnectionState("disconnected");
            setErrorMessage(msg.reason || "Peer disconnected.");
            break;
          }

          case "error": {
            setErrorMessage(msg.message);
            setConnectionState("failed");
            break;
          }
        }
      },
      onError: (err) => {
        setErrorMessage("Signaling error occurred.");
        setConnectionState("failed");
      },
    });
  }, [cleanupConnections, isMockMode]);

  // Guest: Join Drop
  const joinRoom = useCallback(
    (code: string) => {
      const formattedCode = code.toUpperCase().trim();
      if (!formattedCode || formattedCode.length !== 5) {
        setErrorMessage("Please enter a valid 5-character room code.");
        return;
      }

      if (isMockMode) {
        setConnectionState("connected");
        setRoomCode(formattedCode);
        activeRoomCodeRef.current = formattedCode;
        setRole("receiver");
        setRemoteDevice({
          browser: "Chrome",
          os: "macOS",
          deviceType: "desktop",
          deviceName: "Chrome on macOS",
        });
        return;
      }

      cleanupConnections();
      setErrorMessage(null);
      setConnectionState("connecting");
      setRoomCode(formattedCode);
      activeRoomCodeRef.current = formattedCode;
      setRole("receiver");
      sounds.click();

      const devInfo = getDeviceInfo();
      const signaling = new SignalingClient();
      signalingRef.current = signaling;

      const webrtc = new WebRTCManager({
        onConnectionStateChange: (state) => {
          console.log("[useRoom Receiver] WebRTC state:", state);
          if (state === "connected") {
            setConnectionState("connected");
            signaling.stopPolling();
            sounds.connected();
          } else if (state === "disconnected" || state === "failed") {
            setConnectionState("disconnected");
          }
        },
        onDataChannelOpen: () => {
          setConnectionState("connected");
          signaling.stopPolling();
        },
        onDataChannelMessage: (data) => {
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
        onIceCandidate: (candidate) => {
          signaling.send({
            type: "ice-candidate",
            roomCode: formattedCode,
            candidate: candidate.toJSON(),
          });
        },
      });
      webrtcRef.current = webrtc;

      signaling.connect({
        onOpen: () => {
          signaling.send({
            type: "join-room",
            roomCode: formattedCode,
            peerInfo: devInfo,
          });
        },
        onMessage: async (msg: SignalingMessage) => {
          switch (msg.type) {
            case "room-joined": {
              if (msg.peerInfo) {
                setRemoteDevice(msg.peerInfo);
              }
              break;
            }

            case "offer": {
              try {
                webrtc.initPeerConnection(false);
                const answer = await webrtc.handleOffer(msg.sdp);
                if (answer) {
                  signaling.send({
                    type: "answer",
                    roomCode: formattedCode,
                    sdp: answer,
                  });
                }
              } catch (err) {
                console.error("[useRoom Receiver] Error creating answer:", err);
                setErrorMessage("Failed to establish peer connection.");
              }
              break;
            }

            case "ice-candidate": {
              webrtc.addIceCandidate(msg.candidate);
              break;
            }

            case "peer-left": {
              setConnectionState("disconnected");
              setErrorMessage(msg.reason || "Peer disconnected.");
              break;
            }

            case "error": {
              setErrorMessage(msg.message);
              setConnectionState("failed");
              break;
            }
          }
        },
        onError: () => {
          setErrorMessage("Could not connect to signaling service.");
          setConnectionState("failed");
        },
      });
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
      // Simulate mock transfer
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

    if (!webrtcRef.current || !webrtcRef.current.isChannelOpen()) {
      setErrorMessage("Data channel is not ready. Please wait for connection.");
      return;
    }

    setConnectionState("transferring");

    for (const item of pending) {
      setActiveFileId(item.id);
      try {
        await transferEngineRef.current?.sendFile(
          item,
          (data) => webrtcRef.current?.send(data) || false,
          () => webrtcRef.current?.getBufferedAmount() || 0,
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
      activeRoomCodeRef.current = "7XK9P";
      setRole("sender");
    } else if (state === "connecting" || state === "connected" || state === "transferring" || state === "completed") {
      setRoomCode("7XK9P");
      activeRoomCodeRef.current = "7XK9P";
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
