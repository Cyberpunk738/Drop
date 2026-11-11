import { NextResponse } from "next/server";
// TURN credentials are necessarily delivered to participating browsers; use a
// restricted TURN account or short-lived credentials from your TURN provider.
export async function GET() {
  const iceServers: RTCIceServer[] = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ];
  const urls = process.env.TURN_URLS?.split(",")
    .map((s) => s.trim())
    .filter((s) => /^turns?:/.test(s));
  if (
    urls?.length &&
    process.env.TURN_USERNAME &&
    process.env.TURN_CREDENTIAL
  ) {
    iceServers.push({
      urls,
      username: process.env.TURN_USERNAME,
      credential: process.env.TURN_CREDENTIAL,
    });
  }
  return NextResponse.json(
    { iceServers },
    { headers: { "Cache-Control": "no-store" } },
  );
}
