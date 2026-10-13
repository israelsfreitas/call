export type PeerId = string;
export type ClientId = string;

export interface RoomParticipantSummary {
  id: PeerId;
  name: string;
  color: string;
  micMuted: boolean;
  camera: boolean;
  screen: boolean;
}

export interface RoomSummary {
  id: string;
  name: string;
  private: boolean;
  capacity: number;
  count: number;
  participants?: RoomParticipantSummary[];
}

export interface Participant {
  id: PeerId;
  name: string;
  color: string;
  micMuted: boolean;
  camera: boolean;
  screen: boolean;
  screenAudio: boolean;
}

export type QualityTier = 'high' | 'medium' | 'low';

export interface RoomState {
  id: string;
  name: string;
  participants: Participant[];
  activeVideos: number;
  tier: QualityTier;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  authorId: PeerId;
  authorName: string;
  authorColor: string;
  text: string;
  ts: number;
}

// Client to Server Messages
export type ClientToServerMessage =
  | { type: 'hello'; clientId: string; name: string }
  | { type: 'set-name'; name: string }
  | { type: 'join-room'; roomId: string; micMuted: boolean }
  | { type: 'leave-room' }
  | { type: 'signal'; to: PeerId; description?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit }
  | { type: 'request-open'; kind: 'camera' | 'screen'; screenAudio?: boolean }
  | { type: 'close'; kind: 'camera' | 'screen' }
  | { type: 'mic'; muted: boolean }
  | { type: 'subscribe'; to: PeerId; camera: boolean; screen: boolean }
  | { type: 'chat-send'; text: string };

// Server to Client Messages
export type ServerToClientMessage =
  | { type: 'welcome'; selfId: PeerId; self: Participant; rooms: RoomSummary[] }
  | { type: 'rooms-state'; rooms: RoomSummary[] }
  | { type: 'room-joined'; room: RoomState; history: ChatMessage[] }
  | { type: 'room-state'; room: RoomState }
  | { type: 'join-denied'; roomId: string; reason: 'room-full' | 'unknown-room' }
  | { type: 'signal'; from: PeerId; description?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit }
  | { type: 'open-granted'; kind: 'camera' | 'screen' }
  | { type: 'open-denied'; kind: 'camera' | 'screen'; reason: 'video-budget-full' | 'screen-limit' | 'camera-limit' }
  | { type: 'subscribe'; from: PeerId; camera: boolean; screen: boolean }
  | { type: 'chat-message'; message: ChatMessage }
  | { type: 'error'; code: string; message: string };
