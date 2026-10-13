import { create } from 'zustand';
import { RoomSummary, Participant } from '../signaling/protocol';
import { signalingClient } from '../signaling/client';
import { ROOMS } from '../config/rooms';

const AVATAR_COLORS = [
  '#171717', '#404040', '#525252', '#059669',
  '#0284c7', '#d97706', '#dc2626', '#7c3aed'
];

function getDeterministicColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

interface HubState {
  isAuthenticated: boolean;
  selfId: string | null;
  clientId: string;
  name: string;
  color: string;
  connectionStatus: 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
  rooms: RoomSummary[];
  loginWithName: (chosenName: string) => boolean;
  authenticate: (password: string, chosenName: string) => boolean;
  setName: (name: string) => void;
  initIdentity: () => void;
  updateRoomsState: (rooms: RoomSummary[]) => void;
  setWelcome: (selfId: string, self: Participant, rooms: RoomSummary[]) => void;
  setConnectionStatus: (status: 'connecting' | 'connected' | 'reconnecting' | 'disconnected') => void;
}

export const useHubStore = create<HubState>((set, get) => ({
  isAuthenticated: localStorage.getItem('call_authenticated') === 'true',
  selfId: null,
  clientId: '',
  name: localStorage.getItem('call_user_name') || '',
  color: AVATAR_COLORS[0],
  connectionStatus: 'disconnected',
  rooms: ROOMS.map(r => ({ ...r, count: 0, participants: [] })),

  initIdentity: () => {
    let clientId = localStorage.getItem('call_client_id');
    if (!clientId) {
      clientId = crypto.randomUUID();
      localStorage.setItem('call_client_id', clientId);
    }

    let name = localStorage.getItem('call_user_name') || '';
    const color = getDeterministicColor(clientId);

    set({ clientId, name, color });

    if (get().isAuthenticated && name) {
      signalingClient.setIdentity(clientId, name);
    }
  },

  loginWithName: (chosenName: string) => {
    const trimmedName = chosenName.trim().slice(0, 24);
    if (!trimmedName) return false;

    localStorage.setItem('call_authenticated', 'true');
    localStorage.setItem('call_user_name', trimmedName);

    const clientId = get().clientId || crypto.randomUUID();
    const color = getDeterministicColor(clientId);

    set({
      isAuthenticated: true,
      name: trimmedName,
      clientId,
      color
    });

    signalingClient.setIdentity(clientId, trimmedName);
    signalingClient.connect();
    return true;
  },

  authenticate: (password: string, chosenName: string) => {
    // Senha única do sistema: '1234' ou qualquer senha definida
    const validPassword = 'call';
    if (password.trim().toLowerCase() !== validPassword) {
      // Aceita também senhas simples como 1234 para facilidade de uso
      if (password.trim() !== '1234') {
        return false;
      }
    }

    const trimmedName = chosenName.trim().slice(0, 24);
    if (!trimmedName) return false;

    localStorage.setItem('call_authenticated', 'true');
    localStorage.setItem('call_user_name', trimmedName);

    const clientId = get().clientId || crypto.randomUUID();
    const color = getDeterministicColor(clientId);

    set({
      isAuthenticated: true,
      name: trimmedName,
      clientId,
      color
    });

    signalingClient.setIdentity(clientId, trimmedName);
    signalingClient.connect();
    return true;
  },

  setName: (name: string) => {
    const trimmed = name.trim().slice(0, 24);
    if (!trimmed) return;
    localStorage.setItem('call_user_name', trimmed);
    set({ name: trimmed });
    signalingClient.setIdentity(get().clientId, trimmed);
    signalingClient.send({ type: 'set-name', name: trimmed });
  },

  updateRoomsState: (rooms: RoomSummary[]) => {
    set({ rooms });
  },

  setWelcome: (selfId: string, self: Participant, rooms: RoomSummary[]) => {
    set({ selfId, rooms, name: self.name || get().name, color: self.color });
  },

  setConnectionStatus: (connectionStatus) => {
    set({ connectionStatus });
  }
}));
