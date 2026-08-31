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
    <div className="flex flex-col min-h-screen bg-paper text-ink">
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
              className="w-full max-w-[600px] mx-auto py-16 px-6 text-center"
            >
              <div className="bg-fog p-10 sm:p-14 rounded-[4px] border-hairline space-y-6">
                <p className="eyebrow-tag">
                  {connectionState === "expired" ? "SESSION EXPIRED" : "CONNECTION ERROR"}
                </p>
                <h3 className="font-editorial text-3xl sm:text-4xl text-ink font-normal">
                  {connectionState === "expired"
                    ? "This Drop has expired"
                    : "Could not connect to peer"}
                </h3>
                <p className="text-caption text-graphite font-sans max-w-sm mx-auto">
                  {errorMessage || "Please create a new drop to initialize a fresh WebRTC data channel."}
                </p>
                <button
                  onClick={() => {
                    sounds.click();
                    handleResetToLive();
                  }}
                  className="px-8 py-4 bg-ink text-paper text-caption font-sans uppercase tracking-widest rounded-[4px] hover:bg-stone hover:text-ink transition-colors"
                >
                  Start New Drop
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
        <div className="flex items-center justify-center min-h-screen text-graphite font-sans text-caption uppercase tracking-widest">
          Loading DROP...
        </div>
      }
    >
      <DropMainApp />
    </Suspense>
  );
}
