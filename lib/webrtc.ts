export interface WebRTCConfig {
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  onDataChannelOpen?: () => void;
  onDataChannelClose?: () => void;
  onDataChannelMessage?: (data: ArrayBuffer | string) => void;
  onIceCandidate?: (candidate: RTCIceCandidate) => void;
  onBufferedAmountLow?: () => void;
}

export class WebRTCManager {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private config: WebRTCConfig;

  constructor(config: WebRTCConfig = {}) {
    this.config = config;
  }

  public initPeerConnection(isInitiator: boolean): RTCPeerConnection {
    this.close();

    const rtcConfig: RTCConfiguration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
      ],
    };

    const pc = new RTCPeerConnection(rtcConfig);
    this.peerConnection = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate && this.config.onIceCandidate) {
        this.config.onIceCandidate(event.candidate);
      }
    };

    pc.onconnectionstatechange = () => {
      if (this.config.onConnectionStateChange) {
        this.config.onConnectionStateChange(pc.connectionState);
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
        if (this.config.onConnectionStateChange) {
          this.config.onConnectionStateChange("disconnected");
        }
      }
    };

    if (isInitiator) {
      // Initiator creates data channel
      const dc = pc.createDataChannel("drop-channel", {
        ordered: true,
      });
      this.setupDataChannel(dc);
    } else {
      // Receiver listens for data channel
      pc.ondatachannel = (event) => {
        this.setupDataChannel(event.channel);
      };
    }

    return pc;
  }

  private setupDataChannel(dc: RTCDataChannel) {
    this.dataChannel = dc;
    dc.binaryType = "arraybuffer";
    dc.bufferedAmountLowThreshold = 256 * 1024; // 256KB threshold for backpressure

    dc.onopen = () => {
      console.log("[WebRTC] Data channel opened");
      if (this.config.onDataChannelOpen) {
        this.config.onDataChannelOpen();
      }
    };

    dc.onclose = () => {
      console.log("[WebRTC] Data channel closed");
      if (this.config.onDataChannelClose) {
        this.config.onDataChannelClose();
      }
    };

    dc.onmessage = (event) => {
      if (this.config.onDataChannelMessage) {
        this.config.onDataChannelMessage(event.data);
      }
    };

    dc.onbufferedamountlow = () => {
      if (this.config.onBufferedAmountLow) {
        this.config.onBufferedAmountLow();
      }
    };

    dc.onerror = (err) => {
      console.error("[WebRTC] DataChannel error:", err);
    };
  }

  public async createOffer(): Promise<RTCSessionDescriptionInit | null> {
    if (!this.peerConnection) return null;
    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      return offer;
    } catch (err) {
      console.error("[WebRTC] Error creating offer:", err);
      throw err;
    }
  }

  public async handleOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit | null> {
    if (!this.peerConnection) return null;
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      await this.flushPendingCandidates();
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      return answer;
    } catch (err) {
      console.error("[WebRTC] Error handling offer:", err);
      throw err;
    }
  }

  public async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) return;
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      await this.flushPendingCandidates();
    } catch (err) {
      console.error("[WebRTC] Error handling answer:", err);
      throw err;
    }
  }

  public async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) {
      this.pendingCandidates.push(candidate);
      return;
    }

    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error("[WebRTC] Error adding ICE candidate:", err);
    }
  }

  private async flushPendingCandidates() {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) return;
    while (this.pendingCandidates.length > 0) {
      const candidate = this.pendingCandidates.shift();
      if (candidate) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("[WebRTC] Error flushing candidate:", err);
        }
      }
    }
  }

  public send(data: string | ArrayBuffer): boolean {
    if (!this.dataChannel || this.dataChannel.readyState !== "open") {
      return false;
    }
    try {
      this.dataChannel.send(data as any);
      return true;
    } catch (err) {
      console.error("[WebRTC] Error sending data:", err);
      return false;
    }
  }

  public getBufferedAmount(): number {
    return this.dataChannel?.bufferedAmount || 0;
  }

  public isChannelOpen(): boolean {
    return this.dataChannel?.readyState === "open";
  }

  public close() {
    if (this.dataChannel) {
      try {
        this.dataChannel.close();
      } catch {}
      this.dataChannel = null;
    }
    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch {}
      this.peerConnection = null;
    }
    this.pendingCandidates = [];
  }
}
