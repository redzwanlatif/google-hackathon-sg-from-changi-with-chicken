// Audio utilities for Gemini Live API
// Input: PCM 16kHz mono
// Output: PCM 24kHz mono

let audioContext: AudioContext | null = null;
let audioQueue: AudioBufferSourceNode[] = [];
let isPlaying = false;

export function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext({ sampleRate: 24000 });
  }
  return audioContext;
}

export async function resumeAudioContext(): Promise<void> {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
}

// Convert Float32Array to base64 PCM for sending to Gemini
export function float32ToBase64(float32Array: Float32Array): string {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  const bytes = new Uint8Array(int16Array.buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert base64 PCM from Gemini to AudioBuffer
export function base64ToAudioBuffer(base64Data: string, sampleRate: number = 24000): AudioBuffer {
  const ctx = getAudioContext();

  // Decode base64 to bytes
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Convert PCM int16 to float32
  const dataView = new DataView(bytes.buffer);
  const float32Array = new Float32Array(bytes.length / 2);
  for (let i = 0; i < float32Array.length; i++) {
    float32Array[i] = dataView.getInt16(i * 2, true) / 32768;
  }

  // Create AudioBuffer
  const audioBuffer = ctx.createBuffer(1, float32Array.length, sampleRate);
  audioBuffer.getChannelData(0).set(float32Array);

  return audioBuffer;
}

// Play audio buffer with queue management
export async function playAudioBuffer(audioBuffer: AudioBuffer): Promise<void> {
  const ctx = getAudioContext();
  await resumeAudioContext();

  const source = ctx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(ctx.destination);

  audioQueue.push(source);

  return new Promise((resolve) => {
    source.onended = () => {
      const index = audioQueue.indexOf(source);
      if (index > -1) {
        audioQueue.splice(index, 1);
      }
      resolve();
    };
    source.start();
  });
}

// Play base64 audio directly
export async function playBase64Audio(base64Data: string): Promise<void> {
  const audioBuffer = base64ToAudioBuffer(base64Data);
  await playAudioBuffer(audioBuffer);
}

// Stop all playing audio
export function stopAllAudio(): void {
  audioQueue.forEach(source => {
    try {
      source.stop();
    } catch (e) {
      // Already stopped
    }
  });
  audioQueue = [];
}

// Audio recorder class for microphone input
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private onDataCallback: ((base64: string) => void) | null = null;

  async start(onData: (base64: string) => void): Promise<void> {
    this.onDataCallback = onData;

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      }
    });

    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType: 'audio/webm;codecs=opus'
    });

    this.mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0 && this.onDataCallback) {
        // Convert blob to base64
        const arrayBuffer = await event.data.arrayBuffer();
        const base64 = this.arrayBufferToBase64(arrayBuffer);
        this.onDataCallback(base64);
      }
    };

    // Record in 100ms chunks for real-time streaming
    this.mediaRecorder.start(100);
  }

  stop(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    this.mediaRecorder = null;
    this.stream = null;
    this.onDataCallback = null;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

// PCM Recorder for raw PCM data (better for Gemini)
export class PCMRecorder {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private onDataCallback: ((base64: string) => void) | null = null;

  async start(onData: (base64: string) => void): Promise<void> {
    this.onDataCallback = onData;

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      }
    });

    this.audioContext = new AudioContext({ sampleRate: 16000 });
    this.source = this.audioContext.createMediaStreamSource(this.mediaStream);

    // Use ScriptProcessorNode for raw PCM access
    // Note: This is deprecated but still works. AudioWorklet is the modern alternative.
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (event) => {
      if (this.onDataCallback) {
        const inputData = event.inputBuffer.getChannelData(0);
        const base64 = float32ToBase64(inputData);
        this.onDataCallback(base64);
      }
    };

    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }

  stop(): void {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    this.onDataCallback = null;
  }
}
