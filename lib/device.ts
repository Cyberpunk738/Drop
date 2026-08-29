import { DeviceInfo } from "@/types";

export function getDeviceInfo(): DeviceInfo {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      browser: "Unknown Browser",
      os: "Unknown OS",
      deviceType: "desktop",
      deviceName: "Browser Client",
    };
  }

  const userAgent = navigator.userAgent;
  let browser = "Browser";
  let os = "Device";
  let deviceType: "desktop" | "mobile" | "tablet" = "desktop";

  // Detect OS
  if (/iPad|iPhone|iPod/.test(userAgent)) {
    os = "iOS";
    deviceType = "mobile";
  } else if (/Android/.test(userAgent)) {
    os = "Android";
    deviceType = /Mobile/.test(userAgent) ? "mobile" : "tablet";
  } else if (/Macintosh|Mac OS X/.test(userAgent)) {
    os = "macOS";
    deviceType = "desktop";
  } else if (/Windows/.test(userAgent)) {
    os = "Windows";
    deviceType = "desktop";
  } else if (/Linux/.test(userAgent)) {
    os = "Linux";
    deviceType = "desktop";
  }

  // Detect Browser
  if (/Brave/i.test(userAgent) || (navigator as any).brave) {
    browser = "Brave";
  } else if (/Edg\//i.test(userAgent)) {
    browser = "Edge";
  } else if (/Chrome\//i.test(userAgent) && !/Chromium|Edg/i.test(userAgent)) {
    browser = "Chrome";
  } else if (/Safari\//i.test(userAgent) && !/Chrome/i.test(userAgent)) {
    browser = "Safari";
  } else if (/Firefox\//i.test(userAgent)) {
    browser = "Firefox";
  } else if (/OPR\//i.test(userAgent) || /Opera/i.test(userAgent)) {
    browser = "Opera";
  }

  return {
    browser,
    os,
    deviceType,
    deviceName: `${browser} on ${os}`,
  };
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (!+bytes) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatSpeed(bytesPerSec: number): string {
  if (!bytesPerSec || bytesPerSec <= 0) return "0 MB/s";
  return `${formatBytes(bytesPerSec)}/s`;
}

export function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return "0s";
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.ceil(seconds % 60);
  return `${mins}m ${secs}s`;
}
