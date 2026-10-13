import { DurableObject } from 'cloudflare:workers';
import {
  RoomSummary,
  RoomParticipantSummary,
  RoomState,
  Participant,
  ChatMessage,
  ClientToServerMessage,
  ServerToClientMessage,
  QualityTier
} from '../src/signaling/protocol';

interface ClientAttachment {
  peerId: string;
  clientId: string;
  name: string;
  color: string;
  roomId: string | null;
  micMuted: boolean;
  camera: boolean;
  screen: boolean;
  screenAudio: boolean;
}

const FIXED_ROOMS: { id: string; name: string; private: boolean; capacity: number }[] = [
  { id: "geral", name: "Sala geral", private: false, capacity: 10 },
  { id: "sala-01", name: "Sala 01", private: false, capacity: 10 },
  { id: "sala-02", name: "Sala 02", private: false, capacity: 10 },
  { id: "sala-03", name: "Sala 03", private: false, capacity: 10 },
  { id: "privada-01", name: "Privada 01", private: true, capacity: 2 }
];

const AVATAR_COLORS = [
  '#8b5cf6', '#3b82f6', '#22c55e', '#14b8a6',
  '#ec4899', '#f59e0b', '#ef4444', '#6366f1'
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

export class Hub extends DurableObject {
  // Rate limiting por WebSocket: ws -> { count: number, resetAt: number }
  private rateLimits: Map<WebSocket, { count: number; resetAt: number }> = new Map();
  // Chat rate limiting por peerId: peerId -> timestamps[]
  private chatRateLimits: Map<string, number[]> = new Map();

  constructor(ctx: DurableObjectState, env: any) {
    super(ctx, env);

    // SQLite migration for chat messages
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        roomId TEXT NOT NULL,
        authorId TEXT NOT NULL,
        authorName TEXT NOT NULL,
        authorColor TEXT NOT NULL,
        text TEXT NOT NULL,
        ts INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_chat_room_ts ON chat_messages(roomId, ts);
    `);

    // Auto response for ping/pong without waking DO
    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair('ping', 'pong')
    );
  }

  async fetch(request: Request): Promise<Response> {
    try {
      console.log('[Hub DO] fetch called for request to:', request.url);
      const webSocketPair = new WebSocketPair();
      const [client, server] = Object.values(webSocketPair);

      const peerId = crypto.randomUUID();
      const initialAttachment: ClientAttachment = {
        peerId,
        clientId: '',
        name: `Convidado ${Math.floor(1000 + Math.random() * 9000)}`,
        color: AVATAR_COLORS[0],
        roomId: null,
        micMuted: false,
        camera: false,
        screen: false,
        screenAudio: false
      };

      // Accept WebSocket with Hibernation API
      this.ctx.acceptWebSocket(server);
      server.serializeAttachment(initialAttachment);

      console.log('[Hub DO] WebSocket accepted successfully, returning 101');
      return new Response(null, {
        status: 101,
        webSocket: client
      });
    } catch (e) {
      console.error('[Hub DO] Error in fetch:', e);
      return new Response(String(e), { status: 500 });
    }
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (typeof message !== 'string') return;
    if (message === 'ping') {
      ws.send('pong');
      return;
    }

    // Rate limit: max 30 msgs/s por socket
    const now = Date.now();
    const rl = this.rateLimits.get(ws) || { count: 0, resetAt: now + 1000 };
    if (now > rl.resetAt) {
      rl.count = 1;
      rl.resetAt = now + 1000;
    } else {
      rl.count++;
      if (rl.count > 30) {
        ws.close(1008, 'Rate limit excedido');
        return;
      }
    }
    this.rateLimits.set(ws, rl);

    let clientData = ws.deserializeAttachment() as ClientAttachment;
    if (!clientData) return;

    let parsed: ClientToServerMessage;
    try {
      if (message.length > 65536) return; // Limite 64KB
      parsed = JSON.parse(message);
    } catch {
      return;
    }

    switch (parsed.type) {
      case 'hello': {
        const clientId = typeof parsed.clientId === 'string' ? parsed.clientId : crypto.randomUUID();
        const rawName = typeof parsed.name === 'string' ? parsed.name.trim().slice(0, 24) : '';
        const name = rawName || clientData.name;
        const color = getDeterministicColor(clientId);

        clientData.clientId = clientId;
        clientData.name = name;
        clientData.color = color;
        ws.serializeAttachment(clientData);

        const selfParticipant: Participant = {
          id: clientData.peerId,
          name: clientData.name,
          color: clientData.color,
          micMuted: clientData.micMuted,
          camera: clientData.camera,
          screen: clientData.screen,
          screenAudio: clientData.screenAudio
        };

        const roomsSummary = this.getRoomsSummary();
        this.sendToWs(ws, {
          type: 'welcome',
          selfId: clientData.peerId,
          self: selfParticipant,
          rooms: roomsSummary
        });
        break;
      }

      case 'set-name': {
        const rawName = typeof parsed.name === 'string' ? parsed.name.trim().slice(0, 24) : '';
        if (!rawName) return;
        clientData.name = rawName;
        ws.serializeAttachment(clientData);

        if (clientData.roomId) {
          this.broadcastRoomState(clientData.roomId);
        }
        break;
      }

      case 'join-room': {
        const targetRoomId = parsed.roomId;
        const targetRoomDef = FIXED_ROOMS.find(r => r.id === targetRoomId);
        if (!targetRoomDef) {
          this.sendToWs(ws, { type: 'join-denied', roomId: targetRoomId, reason: 'unknown-room' });
          return;
        }

        // Se já está nessa sala, ignora
        if (clientData.roomId === targetRoomId) {
          return;
        }

        // Se estava em outra sala, sai dela primeiro
        const previousRoomId = clientData.roomId;
        if (previousRoomId) {
          this.handleLeaveRoom(ws, clientData);
          clientData = ws.deserializeAttachment() as ClientAttachment;
        }

        // Checar capacidade da nova sala
        const socketsInTarget = this.getSocketsInRoom(targetRoomId);
        if (socketsInTarget.length >= targetRoomDef.capacity) {
          this.sendToWs(ws, { type: 'join-denied', roomId: targetRoomId, reason: 'room-full' });
          return;
        }

        // Entra na sala
        clientData.roomId = targetRoomId;
        clientData.micMuted = !!parsed.micMuted;
        clientData.camera = false;
        clientData.screen = false;
        clientData.screenAudio = false;
        ws.serializeAttachment(clientData);

        // Busca histórico das últimas 100 mensagens
        const history = this.getChatHistory(targetRoomId);
        const roomState = this.buildRoomState(targetRoomId);

        this.sendToWs(ws, {
          type: 'room-joined',
          room: roomState,
          history
        });

        // Notifica membros da sala e atualiza ocupação geral
        this.broadcastRoomState(targetRoomId);
        this.broadcastRoomsState();
        break;
      }

      case 'leave-room': {
        if (clientData.roomId) {
          const oldRoom = clientData.roomId;
          this.handleLeaveRoom(ws, clientData);
          this.broadcastRoomState(oldRoom);
          this.broadcastRoomsState();
        }
        break;
      }

      case 'signal': {
        if (!clientData.roomId || !parsed.to) return;
        const targetWs = this.findSocketByPeerId(parsed.to);
        if (targetWs) {
          const targetData = targetWs.deserializeAttachment() as ClientAttachment;
          // Só repassa se estiverem na MESMA sala
          if (targetData && targetData.roomId === clientData.roomId) {
            this.sendToWs(targetWs, {
              type: 'signal',
              from: clientData.peerId,
              description: parsed.description,
              candidate: parsed.candidate
            });
          }
        }
        break;
      }

      case 'request-open': {
        if (!clientData.roomId) return;
        const currentRoomState = this.buildRoomState(clientData.roomId);

        if (parsed.kind === 'camera') {
          const currentCameras = currentRoomState.participants.filter(p => p.camera).length;
          if (currentRoomState.activeVideos >= 12) {
            this.sendToWs(ws, { type: 'open-denied', kind: 'camera', reason: 'video-budget-full' });
            return;
          }
          if (currentCameras >= 10) {
            this.sendToWs(ws, { type: 'open-denied', kind: 'camera', reason: 'camera-limit' });
            return;
          }
          clientData.camera = true;
          ws.serializeAttachment(clientData);
          this.sendToWs(ws, { type: 'open-granted', kind: 'camera' });
          this.broadcastRoomState(clientData.roomId);
        } else if (parsed.kind === 'screen') {
          const currentScreens = currentRoomState.participants.filter(p => p.screen).length;
          if (currentRoomState.activeVideos >= 12) {
            this.sendToWs(ws, { type: 'open-denied', kind: 'screen', reason: 'video-budget-full' });
            return;
          }
          if (currentScreens >= 3) {
            this.sendToWs(ws, { type: 'open-denied', kind: 'screen', reason: 'screen-limit' });
            return;
          }
          clientData.screen = true;
          clientData.screenAudio = !!parsed.screenAudio;
          ws.serializeAttachment(clientData);
          this.sendToWs(ws, { type: 'open-granted', kind: 'screen' });
          this.broadcastRoomState(clientData.roomId);
        }
        break;
      }

      case 'close': {
        if (!clientData.roomId) return;
        if (parsed.kind === 'camera') {
          clientData.camera = false;
        } else if (parsed.kind === 'screen') {
          clientData.screen = false;
          clientData.screenAudio = false;
        }
        ws.serializeAttachment(clientData);
        this.broadcastRoomState(clientData.roomId);
        break;
      }

      case 'mic': {
        if (!clientData.roomId) return;
        clientData.micMuted = !!parsed.muted;
        ws.serializeAttachment(clientData);
        this.broadcastRoomState(clientData.roomId);
        break;
      }

      case 'subscribe': {
        if (!clientData.roomId || !parsed.to) return;
        const targetWs = this.findSocketByPeerId(parsed.to);
        if (targetWs) {
          const targetData = targetWs.deserializeAttachment() as ClientAttachment;
          if (targetData && targetData.roomId === clientData.roomId) {
            this.sendToWs(targetWs, {
              type: 'subscribe',
              from: clientData.peerId,
              camera: parsed.camera,
              screen: parsed.screen
            });
          }
        }
        break;
      }

      case 'chat-send': {
        if (!clientData.roomId) return;
        const text = typeof parsed.text === 'string' ? parsed.text.trim().slice(0, 500) : '';
        if (!text) return;

        // Rate limit do chat: max 5 msgs a cada 5s
        const pId = clientData.peerId;
        const chatTimes = this.chatRateLimits.get(pId) || [];
        const fiveSecAgo = now - 5000;
        const recent = chatTimes.filter(t => t > fiveSecAgo);
        if (recent.length >= 5) {
          this.sendToWs(ws, { type: 'error', code: 'CHAT_RATE_LIMIT', message: 'Envio rápido demais. Aguarde alguns segundos.' });
          return;
        }
        recent.push(now);
        this.chatRateLimits.set(pId, recent);

        const chatMessage: ChatMessage = {
          id: crypto.randomUUID(),
          roomId: clientData.roomId,
          authorId: clientData.peerId,
          authorName: clientData.name,
          authorColor: clientData.color,
          text,
          ts: now
        };

        // Salvar no SQLite
        this.saveChatMessage(chatMessage);

        // Repassar para todos na sala
        const sockets = this.getSocketsInRoom(clientData.roomId);
        for (const s of sockets) {
          this.sendToWs(s, {
            type: 'chat-message',
            message: chatMessage
          });
        }
        break;
      }
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    const clientData = ws.deserializeAttachment() as ClientAttachment;
    this.rateLimits.delete(ws);
    if (clientData) {
      this.chatRateLimits.delete(clientData.peerId);
      if (clientData.roomId) {
        const roomId = clientData.roomId;
        clientData.roomId = null;
        clientData.camera = false;
        clientData.screen = false;
        this.broadcastRoomState(roomId);
        this.broadcastRoomsState();
      }
    }
  }

  async webSocketError(ws: WebSocket, error: any) {
    this.rateLimits.delete(ws);
  }

  private handleLeaveRoom(ws: WebSocket, clientData: ClientAttachment) {
    clientData.roomId = null;
    clientData.camera = false;
    clientData.screen = false;
    clientData.screenAudio = false;
    ws.serializeAttachment(clientData);
  }

  private getSocketsInRoom(roomId: string): WebSocket[] {
    const sockets = this.ctx.getWebSockets();
    return sockets.filter(ws => {
      const data = ws.deserializeAttachment() as ClientAttachment;
      return data && data.roomId === roomId;
    });
  }

  private findSocketByPeerId(peerId: string): WebSocket | null {
    const sockets = this.ctx.getWebSockets();
    for (const ws of sockets) {
      const data = ws.deserializeAttachment() as ClientAttachment;
      if (data && data.peerId === peerId) {
        return ws;
      }
    }
    return null;
  }

  private getRoomsSummary(): RoomSummary[] {
    const sockets = this.ctx.getWebSockets();
    const roomParticipants: Record<string, RoomParticipantSummary[]> = {};
    for (const r of FIXED_ROOMS) {
      roomParticipants[r.id] = [];
    }
    for (const ws of sockets) {
      const data = ws.deserializeAttachment() as ClientAttachment;
      if (data && data.roomId && roomParticipants[data.roomId]) {
        roomParticipants[data.roomId].push({
          id: data.peerId,
          name: data.name,
          color: data.color,
          micMuted: data.micMuted,
          camera: data.camera,
          screen: data.screen
        });
      }
    }

    return FIXED_ROOMS.map(r => ({
      id: r.id,
      name: r.name,
      private: r.private,
      capacity: r.capacity,
      count: roomParticipants[r.id].length,
      participants: roomParticipants[r.id]
    }));
  }

  private buildRoomState(roomId: string): RoomState {
    const roomDef = FIXED_ROOMS.find(r => r.id === roomId) || { id: roomId, name: roomId };
    const sockets = this.getSocketsInRoom(roomId);

    const participants: Participant[] = sockets.map(ws => {
      const data = ws.deserializeAttachment() as ClientAttachment;
      return {
        id: data.peerId,
        name: data.name,
        color: data.color,
        micMuted: data.micMuted,
        camera: data.camera,
        screen: data.screen,
        screenAudio: data.screenAudio
      };
    });

    // Ordenação lexicográfica por ID para consistência
    participants.sort((a, b) => a.id.localeCompare(b.id));

    const activeVideos = participants.reduce((acc, p) => acc + (p.camera ? 1 : 0) + (p.screen ? 1 : 0), 0);

    let tier: QualityTier = 'high';
    if (activeVideos >= 9) {
      tier = 'low';
    } else if (activeVideos >= 5) {
      tier = 'medium';
    }

    return {
      id: roomId,
      name: roomDef.name,
      participants,
      activeVideos,
      tier
    };
  }

  private broadcastRoomState(roomId: string) {
    const roomState = this.buildRoomState(roomId);
    const sockets = this.getSocketsInRoom(roomId);
    for (const ws of sockets) {
      this.sendToWs(ws, {
        type: 'room-state',
        room: roomState
      });
    }
  }

  private broadcastRoomsState() {
    const summary = this.getRoomsSummary();
    const sockets = this.ctx.getWebSockets();
    for (const ws of sockets) {
      this.sendToWs(ws, {
        type: 'rooms-state',
        rooms: summary
      });
    }
  }

  private sendToWs(ws: WebSocket, msg: ServerToClientMessage) {
    try {
      ws.send(JSON.stringify(msg));
    } catch (e) {
      console.warn('Erro ao enviar mensagem pelo WebSocket:', e);
    }
  }

  private saveChatMessage(msg: ChatMessage) {
    try {
      this.ctx.storage.sql.exec(
        `INSERT INTO chat_messages (id, roomId, authorId, authorName, authorColor, text, ts)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        msg.id, msg.roomId, msg.authorId, msg.authorName, msg.authorColor, msg.text, msg.ts
      );

      // Limpar mensagens mais antigas que as últimas 100 dessa sala
      this.ctx.storage.sql.exec(
        `DELETE FROM chat_messages WHERE roomId = ? AND id NOT IN (
           SELECT id FROM chat_messages WHERE roomId = ? ORDER BY ts DESC LIMIT 100
         )`,
        msg.roomId, msg.roomId
      );
    } catch (e) {
      console.error('Erro ao salvar mensagem no SQLite:', e);
    }
  }

  private getChatHistory(roomId: string): ChatMessage[] {
    try {
      const cursor = this.ctx.storage.sql.exec(
        `SELECT id, roomId, authorId, authorName, authorColor, text, ts
         FROM chat_messages WHERE roomId = ? ORDER BY ts ASC LIMIT 100`,
        roomId
      );
      const rows: ChatMessage[] = [];
      for (const row of cursor) {
        rows.push({
          id: row.id as string,
          roomId: row.roomId as string,
          authorId: row.authorId as string,
          authorName: row.authorName as string,
          authorColor: row.authorColor as string,
          text: row.text as string,
          ts: Number(row.ts)
        });
      }
      return rows;
    } catch (e) {
      console.error('Erro ao ler mensagens do SQLite:', e);
      return [];
    }
  }
}
