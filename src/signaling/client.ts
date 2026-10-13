import { ClientToServerMessage, ServerToClientMessage } from './protocol';

type MessageHandler = (msg: ServerToClientMessage) => void;
type StatusHandler = (status: 'connecting' | 'connected' | 'reconnecting' | 'disconnected') => void;

export class SignalingClient {
  private ws: WebSocket | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private statusHandlers: Set<StatusHandler> = new Set();
  private pendingQueue: ClientToServerMessage[] = [];
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private isExplicitlyClosed = false;
  private clientId: string = '';
  private currentName: string = '';
  private currentRoomId: string | null = null;
  private currentMicMuted: boolean = false;

  constructor() {}

  public setIdentity(clientId: string, name: string) {
    this.clientId = clientId;
    this.currentName = name;
  }

  public setRoomContext(roomId: string | null, micMuted: boolean) {
    this.currentRoomId = roomId;
    this.currentMicMuted = micMuted;
  }

  public connect() {
    this.isExplicitlyClosed = false;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.notifyStatus(this.reconnectAttempt === 0 ? 'connecting' : 'reconnecting');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/hub/ws`;

    try {
      const socket = new WebSocket(wsUrl);
      this.ws = socket;

      socket.onopen = () => {
        if (this.ws !== socket) return;
        this.reconnectAttempt = 0;
        this.notifyStatus('connected');
        this.startPing();

        // Envia hello imediatamente
        if (this.clientId) {
          this.send({ type: 'hello', clientId: this.clientId, name: this.currentName });
        }

        // Se estava em sala antes da reconexão, tenta reentrar
        if (this.currentRoomId) {
          this.send({
            type: 'join-room',
            roomId: this.currentRoomId,
            micMuted: this.currentMicMuted
          });
        }

        // Drena fila pendente
        while (this.pendingQueue.length > 0) {
          const msg = this.pendingQueue.shift();
          if (msg) this.send(msg);
        }
      };

      socket.onmessage = (event) => {
        if (this.ws !== socket) return;
        if (event.data === 'pong') return;
        try {
          const msg = JSON.parse(event.data) as ServerToClientMessage;
          this.messageHandlers.forEach(handler => handler(msg));
        } catch (e) {
          console.warn('Erro ao processar mensagem do servidor:', e, event.data);
        }
      };

      socket.onclose = () => {
        if (this.ws !== socket) return;
        this.stopPing();
        this.ws = null;
        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        } else {
          this.notifyStatus('disconnected');
        }
      };

      socket.onerror = (err) => {
        if (this.ws !== socket) return;
        console.warn('WebSocket erro:', err);
      };
    } catch (e) {
      console.error('Falha ao abrir WebSocket:', e);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    this.reconnectAttempt++;
    if (this.reconnectAttempt > 1) {
      this.notifyStatus('reconnecting');
    }
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    // Backoff: 1s, 2s, 5s, depois a cada 5s
    const delays = [1000, 2000, 5000];
    const delay = this.reconnectAttempt < delays.length ? delays[this.reconnectAttempt - 1] : 5000;

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private startPing() {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send('ping');
      }
    }, 20000);
  }

  private stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  public send(msg: ClientToServerMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      // Guarda para quando conectar
      if (msg.type !== 'signal') { // Não acumular sinais desatualizados na fila
        this.pendingQueue.push(msg);
      }
      if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
        this.connect();
      }
    }
  }

  public onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  public onStatus(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  private notifyStatus(status: 'connecting' | 'connected' | 'reconnecting' | 'disconnected') {
    this.statusHandlers.forEach(h => h(status));
  }

  public disconnect() {
    this.isExplicitlyClosed = true;
    this.stopPing();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    const currentWs = this.ws;
    this.ws = null;
    if (currentWs) {
      currentWs.onopen = null;
      currentWs.onmessage = null;
      currentWs.onclose = null;
      currentWs.onerror = null;
      try {
        currentWs.close();
      } catch {}
    }
    this.notifyStatus('disconnected');
  }

  public reconnectNow() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
    }
    this.connect();
  }
}

export const signalingClient = new SignalingClient();
