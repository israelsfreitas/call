export interface MediaDeviceInfoList {
  audioInputs: MediaDeviceInfo[];
  videoInputs: MediaDeviceInfo[];
  audioOutputs: MediaDeviceInfo[];
}

export class DeviceManager {
  public static async getDevices(): Promise<MediaDeviceInfoList> {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return { audioInputs: [], videoInputs: [], audioOutputs: [] };
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return {
        audioInputs: devices.filter(d => d.kind === 'audioinput'),
        videoInputs: devices.filter(d => d.kind === 'videoinput'),
        audioOutputs: devices.filter(d => d.kind === 'audiooutput')
      };
    } catch (e) {
      console.warn('Erro ao listar dispositivos:', e);
      return { audioInputs: [], videoInputs: [], audioOutputs: [] };
    }
  }

  public static async getMicrophone(deviceId?: string): Promise<MediaStream> {
    const constraints: MediaStreamConstraints = {
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: false
    };
    return await navigator.mediaDevices.getUserMedia(constraints);
  }

  public static async getCamera(deviceId?: string): Promise<MediaStream> {
    const constraints: MediaStreamConstraints = {
      video: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      },
      audio: false
    };
    return await navigator.mediaDevices.getUserMedia(constraints);
  }

  public static async getDisplayMedia(): Promise<MediaStream> {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      throw new Error('Compartilhamento de tela não suportado neste navegador.');
    }

    return await navigator.mediaDevices.getDisplayMedia({
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 15 }
      },
      audio: true // Tenta obter áudio de tela se suportado (Chrome/Edge aba/sistema)
    });
  }

  public static isDisplayMediaSupported(): boolean {
    return typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getDisplayMedia === 'function';
  }
}
