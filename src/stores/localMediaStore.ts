import { create } from 'zustand';
import { DeviceManager } from '../media/devices';

interface LocalMediaState {
  micStream: MediaStream | null;
  cameraStream: MediaStream | null;
  screenStream: MediaStream | null;
  isMicMuted: boolean;
  isIncomingAudioMuted: boolean; // Botão "Som"
  selectedAudioInputId: string;
  selectedVideoInputId: string;
  selectedAudioOutputId: string;
  isSpeaking: boolean;

  setMicMuted: (muted: boolean) => void;
  setIncomingAudioMuted: (muted: boolean) => void;
  setAudioInputId: (id: string) => void;
  setVideoInputId: (id: string) => void;
  setAudioOutputId: (id: string) => void;
  setMicStream: (stream: MediaStream | null) => void;
  setCameraStream: (stream: MediaStream | null) => void;
  setScreenStream: (stream: MediaStream | null) => void;
  setIsSpeaking: (speaking: boolean) => void;
  stopAllMedia: () => void;
}

export const useLocalMediaStore = create<LocalMediaState>((set, get) => ({
  micStream: null,
  cameraStream: null,
  screenStream: null,
  isMicMuted: false,
  isIncomingAudioMuted: false,
  selectedAudioInputId: '',
  selectedVideoInputId: '',
  selectedAudioOutputId: '',
  isSpeaking: false,

  setMicMuted: (muted) => {
    const stream = get().micStream;
    if (stream) {
      stream.getAudioTracks().forEach(t => {
        t.enabled = !muted;
      });
    }
    set({ isMicMuted: muted });
  },

  setIncomingAudioMuted: (muted) => set({ isIncomingAudioMuted: muted }),
  setAudioInputId: (id) => set({ selectedAudioInputId: id }),
  setVideoInputId: (id) => set({ selectedVideoInputId: id }),
  setAudioOutputId: (id) => set({ selectedAudioOutputId: id }),
  setMicStream: (stream) => set({ micStream: stream }),
  setCameraStream: (stream) => set({ cameraStream: stream }),
  setScreenStream: (stream) => set({ screenStream: stream }),
  setIsSpeaking: (isSpeaking) => set({ isSpeaking }),

  stopAllMedia: () => {
    const { micStream, cameraStream, screenStream } = get();
    if (micStream) {
      micStream.getTracks().forEach(t => t.stop());
    }
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
    }
    if (screenStream) {
      screenStream.getTracks().forEach(t => t.stop());
    }
    set({ micStream: null, cameraStream: null, screenStream: null, isSpeaking: false });
  }
}));
