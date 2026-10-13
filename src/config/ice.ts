export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

const DEFAULT_STUN_SERVERS: RTCIceServer[] = [
  { urls: ["stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302"] }
];

export async function fetchIceServers(): Promise<RTCIceServer[]> {
  try {
    const res = await fetch("/api/ice");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.iceServers) && data.iceServers.length > 0) {
        return data.iceServers;
      }
    }
  } catch (err) {
    console.warn("Falha ao buscar ICE servers em /api/ice, usando padrão:", err);
  }
  return DEFAULT_STUN_SERVERS;
}
