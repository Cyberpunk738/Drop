"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { LandingView } from "@/components/LandingView";
import { CreateDropView } from "@/components/CreateDropView";
import { JoinDropView } from "@/components/JoinDropView";
import { TransferView } from "@/components/TransferView";
import { DemoStateSwitcher } from "@/components/DemoStateSwitcher";
import { useRoom } from "@/hooks/useRoom";
import { AlertCircle, RefreshCw } from "lucide-react";
import { sounds } from "@/lib/audio";

function DropMainApp() {
  const searchParams = useSearchParams();
  const [viewOverride, setViewOverride] = useState<"landing" | "join" | null>(null);

  const {
    connectionState,
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
  } = useRoom();

  // If URL has ?code=XXXXX, navigate directly to join
  useEffect(() => {
    const urlCode = searchParams.get("code");
    if (urlCode && urlCode.length === 5 && connectionState === "idle") {
      setViewOverride("join");
    }
  }, [searchParams, connectionState]);

  const handleResetToLive = () => {
    setIsMockMode(false);
    resetToLanding();
    setViewOverride(null);
  };

  const isLanding = connectionState === "idle" && viewOverride !== "join";
  const isJoining = (connectionState === "idle" && viewOverride === "join") || connectionState === "connecting";
  const isCreating = connectionState === "creating" || connectionState === "waiting";
  const isConnectedOrTransferring =
    connectionState === "connected" ||
    connectionState === "transferring" ||
    connectionState === "completed" ||
    connectionState === "disconnected";
  const isFailedOrExpired = connectionState === "failed" || connectionState === "expired";

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar
        connectionState={connectionState}
        localDevice={localDevice}
        remoteDevice={remoteDevice}
        onReset={handleResetToLive}
      />

      <main className="flex-1 flex flex-col justify-center relative">
        <AnimatePresence mode="wait">
          {/* 1. Landing Screen */}
          {isLanding && (
            <LandingView
              key="landing"
              onCreateDrop={createRoom}
              onJoinDrop={() => setViewOverride("join")}
            />
          )}

          {/* 2. Create Drop / Waiting Screen */}
          {isCreating && (
            <CreateDropView
              key="create"
              roomCode={roomCode}
              onCancel={handleResetToLive}
            />
          )}

          {/* 3. Join Drop Screen */}
          {isJoining && (
            <JoinDropView
              key="join"
              initialCode={searchParams.get("code") || ""}
              onJoin={(code) => joinRoom(code)}
              onBack={handleResetToLive}
              errorMessage={errorMessage}
            />
          )}

          {/* 4. Connected / Transfer / Complete Screen */}
          {isConnectedOrTransferring && (
            <TransferView
              key="transfer"
              connectionState={connectionState}
              remoteDevice={remoteDevice}
              files={files}
              activeFileId={activeFileId}
              role={role}
              errorMessage={errorMessage}
              onFilesSelected={addFiles}
              onSendFiles={sendQueuedFiles}
              onCancelTransfer={cancelTransfer}
              onLeave={handleResetToLive}
            />
          )}

          {/* 5. Error / Expired Fallback Screen */}
          {isFailedOrExpired && (
            <div
              key="error"
              className="w-full max-w-md mx-auto py-12 px-4 text-center space-y-6"
            >
              <div className="glass-panel p-8 rounded-3xl space-y-5">
                <div className="w-14 h-14 rounded-2xl bg-rose-950/60 border border-rose-800/60 flex items-center justify-center mx-auto text-rose-400">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-mono font-bold text-white">
                    {connectionState === "expired" ? "Drop Expired" : "Connection Error"}
                  </h3>
                  <p className="text-xs font-mono text-zinc-400">
                    {errorMessage || "Unable to establish peer connection."}
                  </p>
                </div>
                <button
                  onClick={() => {
                    sounds.click();
                    handleResetToLive();
                  }}
                  className="w-full py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 font-mono text-xs font-semibold text-zinc-950 shadow-glow transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Start New Drop</span>
                </button>
              </div>
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* State Switcher for rapid UI testing and verification */}
      <DemoStateSwitcher
        currentState={connectionState}
        isMockMode={isMockMode}
        onSetState={setMockState}
        onResetLive={handleResetToLive}
      />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen text-zinc-400 font-mono text-xs">
          Loading DROP...
        </div>
      }
    >
      <DropMainApp />
    </Suspense>
  );
}
