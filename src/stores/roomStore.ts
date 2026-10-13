import { create } from 'zustand';
import { RoomState, Participant, ChatMessage, QualityTier } from '../signaling/protocol';

export interface RemotePeerMedia {
  audioStream: MediaStream | null;
  cameraStream: MediaStream | null;
  screenStream: MediaStream | null;
  screenAudioStream: MediaStream | null;
  isSpeaking: boolean;
  screenVolume: number;
  screenAudioMuted: boolean;
}

interface RoomStoreState {
  currentRoom: RoomState | null;
  messages: ChatMessage[];
  peerMedia: Record<string, RemotePeerMedia>; // peerId -> streams
  isVoiceConnecting: boolean;

  setRoomJoined: (room: RoomState, history: ChatMessage[]) => void;
  updateRoomState: (room: RoomState) => void;
  leaveRoomState: () => void;
  setVoiceConnecting: (connecting: boolean) => void;
  addChatMessage: (message: ChatMessage) => void;

  setPeerStream: (
    peerId: string,
    type: 'audio' | 'camera' | 'screen' | 'screenAudio',
    stream: MediaStream | null
  ) => void;
  setPeerSpeaking: (peerId: string, isSpeaking: boolean) => void;
  setPeerScreenVolume: (peerId: string, volume: number) => void;
  setPeerScreenAudioMuted: (peerId: string, muted: boolean) => void;
  removePeerMedia: (peerId: string) => void;
}

export const useRoomStore = create<RoomStoreState>((set, get) => ({
  currentRoom: null,
  messages: [],
  peerMedia: {},
  isVoiceConnecting: false,

  setRoomJoined: (room, history) => {
    set({
      currentRoom: room,
      messages: history,
      isVoiceConnecting: false
    });
  },

  updateRoomState: (room) => {
    set((state) => {
      // Remove media de participantes que saíram
      const currentIds = new Set(room.participants.map(p => p.id));
      const newPeerMedia = { ...state.peerMedia };
      for (const id in newPeerMedia) {
        if (!currentIds.has(id)) {
          delete newPeerMedia[id];
        }
      }
      return {
        currentRoom: room,
        peerMedia: newPeerMedia
      };
    });
  },

  leaveRoomState: () => {
    set({
      currentRoom: null,
      messages: [],
      peerMedia: {},
      isVoiceConnecting: false
    });
  },

  setVoiceConnecting: (isVoiceConnecting) => set({ isVoiceConnecting }),

  addChatMessage: (message) => {
    set(state => {
      if (state.messages.some(m => m.id === message.id)) return state;
      return {
        messages: [...state.messages.slice(-99), message]
      };
    });
  },

  setPeerStream: (peerId, type, stream) => {
    set(state => {
      const current = state.peerMedia[peerId] || {
        audioStream: null,
        cameraStream: null,
        screenStream: null,
        screenAudioStream: null,
        isSpeaking: false,
        screenVolume: 1,
        screenAudioMuted: true // Padrão: áudio da tela começa mudo por espectador
      };

      const updated = { ...current };
      if (type === 'audio') updated.audioStream = stream;
      if (type === 'camera') updated.cameraStream = stream;
      if (type === 'screen') updated.screenStream = stream;
      if (type === 'screenAudio') updated.screenAudioStream = stream;

      return {
        peerMedia: {
          ...state.peerMedia,
          [peerId]: updated
        }
      };
    });
  },

  setPeerSpeaking: (peerId, isSpeaking) => {
    set(state => {
      const current = state.peerMedia[peerId];
      if (!current || current.isSpeaking === isSpeaking) return state;
      return {
        peerMedia: {
          ...state.peerMedia,
          [peerId]: { ...current, isSpeaking }
        }
      };
    });
  },

  setPeerScreenVolume: (peerId, volume) => {
    set(state => {
      const current = state.peerMedia[peerId];
      if (!current) return state;
      return {
        peerMedia: {
          ...state.peerMedia,
          [peerId]: { ...current, screenVolume: volume }
        }
      };
    });
  },

  setPeerScreenAudioMuted: (peerId, muted) => {
    set(state => {
      const current = state.peerMedia[peerId];
      if (!current) return state;
      return {
        peerMedia: {
          ...state.peerMedia,
          [peerId]: { ...current, screenAudioMuted: muted }
        }
      };
    });
  },

  removePeerMedia: (peerId) => {
    set(state => {
      const copy = { ...state.peerMedia };
      delete copy[peerId];
      return { peerMedia: copy };
    });
  }
}));
