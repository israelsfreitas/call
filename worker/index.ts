import { Hub } from './Hub';

export interface Env {
  HUB: DurableObjectNamespace<Hub>;
  ASSETS?: Fetcher;
  TURN_KEY_ID?: string;
  TURN_KEY_API_TOKEN?: string;
}

export { Hub };

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // 1. Rota de WebSocket da Sinalização: /api/hub/ws
    if (url.pathname === '/api/hub/ws') {
      console.log('[Worker] /api/hub/ws request received, upgrade header:', request.headers.get('Upgrade'));
      // Um único Durable Object endereçado por idFromName('main')
      const id = env.HUB.idFromName('main');
      const hubStub = env.HUB.get(id);
      return hubStub.fetch(request);
    }

    // 2. Rota de ICE Servers: /api/ice
    if (url.pathname === '/api/ice') {
      const defaultStun = [
        'stun:stun.cloudflare.com:3478',
        'stun:stun.l.google.com:19302'
      ];

      const iceServers: RTCIceServer[] = [
        { urls: defaultStun }
      ];

      // Se TURN_KEY_ID e TURN_KEY_API_TOKEN existirem (M7), gera credenciais
      if (env.TURN_KEY_ID && env.TURN_KEY_API_TOKEN) {
        try {
          const turnUrl = `https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate`;
          const turnRes = await fetch(turnUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${env.TURN_KEY_API_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ttl: 86400 })
          });
          if (turnRes.ok) {
            const turnData = await turnRes.json() as any;
            if (turnData.iceServers) {
              return new Response(JSON.stringify({ iceServers: turnData.iceServers }), {
                headers: { 'Content-Type': 'application/json' }
              });
            }
          }
        } catch (e) {
          console.warn('Erro ao obter Cloudflare TURN, usando apenas STUN:', e);
        }
      }

      return new Response(JSON.stringify({ iceServers }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // 3. Static Assets (se deployado com binding ASSETS)
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not Found', { status: 404 });
  }
};
