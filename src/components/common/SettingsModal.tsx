import React, { useEffect, useState, useRef } from 'react';
import { Modal } from './Modal';
import { useUIStore } from '../../stores/uiStore';
import { useLocalMediaStore } from '../../stores/localMediaStore';
import { DeviceManager, MediaDeviceInfoList } from '../../media/devices';
import { webRtcMesh } from '../../rtc/Mesh';

export const SettingsModal: React.FC = () => {
  const { isSettingsOpen, setIsSettingsOpen } = useUIStore();
  const {
    selectedAudioInputId,
    selectedVideoInputId,
    selectedAudioOutputId,
    setAudioInputId,
    setVideoInputId,
    setAudioOutputId
  } = useLocalMediaStore();

  const [devices, setDevices] = useState<MediaDeviceInfoList>({
    audioInputs: [],
    videoInputs: [],
    audioOutputs: []
  });

  const [micLevel, setMicLevel] = useState<number>(0);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isSettingsOpen) {
      if (previewStreamRef.current) {
        previewStreamRef.current.getTracks().forEach(t => t.stop());
        previewStreamRef.current = null;
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(t => t.stop());
        micStreamRef.current = null;
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      return;
    }

    DeviceManager.getDevices().then((devs) => {
      setDevices(devs);
      if (!selectedAudioInputId && devs.audioInputs.length > 0) {
        setAudioInputId(devs.audioInputs[0].deviceId);
      }
      if (!selectedVideoInputId && devs.videoInputs.length > 0) {
        setVideoInputId(devs.videoInputs[0].deviceId);
      }
      if (!selectedAudioOutputId && devs.audioOutputs.length > 0) {
        setAudioOutputId(devs.audioOutputs[0].deviceId);
      }
    });

    DeviceManager.getMicrophone(selectedAudioInputId).then(stream => {
      micStreamRef.current = stream;
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);

        const dataArray = new Uint8Array(32);
        const updateLevel = () => {
          analyser.getByteFrequencyData(dataArray);
          const sum = dataArray.reduce((acc, v) => acc + v, 0);
          setMicLevel(Math.min(100, Math.round((sum / dataArray.length / 128) * 100)));
          animFrameRef.current = requestAnimationFrame(updateLevel);
        };
        updateLevel();
      } catch (e) {}
    }).catch(() => {});

    DeviceManager.getCamera(selectedVideoInputId).then(stream => {
      previewStreamRef.current = stream;
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream;
      }
    }).catch(() => {});

    return () => {
      if (previewStreamRef.current) {
        previewStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isSettingsOpen, selectedAudioInputId, selectedVideoInputId]);

  const handleAudioInputChange = async (id: string) => {
    setAudioInputId(id);
    try {
      const stream = await DeviceManager.getMicrophone(id);
      const track = stream.getAudioTracks()[0];
      useLocalMediaStore.getState().setMicStream(stream);
      await webRtcMesh.setLocalMicTrack(track);
    } catch {}
  };

  const handleVideoInputChange = async (id: string) => {
    setVideoInputId(id);
    const { cameraStream } = useLocalMediaStore.getState();
    if (cameraStream) {
      try {
        const stream = await DeviceManager.getCamera(id);
        useLocalMediaStore.getState().setCameraStream(stream);
        await webRtcMesh.publishLocalCamera();
      } catch {}
    }
  };

  return (
    <Modal
      isOpen={isSettingsOpen}
      onClose={() => setIsSettingsOpen(false)}
      title="Ajustes de Dispositivos"
    >
      <div className="flex flex-col gap-5 text-sm">
        {/* Microfone */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[#171717]">
            Microfone
          </label>
          <select
            value={selectedAudioInputId}
            onChange={(e) => handleAudioInputChange(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-[14px] bg-[#F7F6F0] border border-[#E7E6DF] text-[#171717] focus:outline-none focus:border-[#171717]"
          >
            {devices.audioInputs.map(dev => (
              <option key={dev.deviceId} value={dev.deviceId}>
                {dev.label || `Microfone ${dev.deviceId.slice(0, 5)}`}
              </option>
            ))}
          </select>
          {/* Medidor de nível */}
          <div className="mt-1">
            <div className="text-[11px] text-[#686861] mb-1">Nível de entrada:</div>
            <div className="w-full h-2 rounded-full bg-[#EFEEE8] overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-75"
                style={{ width: `${micLevel}%` }}
              />
            </div>
          </div>
        </div>

        {/* Saída de áudio */}
        {devices.audioOutputs.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#171717]">
              Saída de áudio
            </label>
            <select
              value={selectedAudioOutputId}
              onChange={(e) => setAudioOutputId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-[14px] bg-[#F7F6F0] border border-[#E7E6DF] text-[#171717] focus:outline-none focus:border-[#171717]"
            >
              {devices.audioOutputs.map(dev => (
                <option key={dev.deviceId} value={dev.deviceId}>
                  {dev.label || `Alto-falante ${dev.deviceId.slice(0, 5)}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Câmera */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[#171717]">
            Câmera
          </label>
          <select
            value={selectedVideoInputId}
            onChange={(e) => handleVideoInputChange(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-[14px] bg-[#F7F6F0] border border-[#E7E6DF] text-[#171717] focus:outline-none focus:border-[#171717]"
          >
            {devices.videoInputs.map(dev => (
              <option key={dev.deviceId} value={dev.deviceId}>
                {dev.label || `Câmera ${dev.deviceId.slice(0, 5)}`}
              </option>
            ))}
          </select>
          {/* Prévia da Câmera */}
          <div className="mt-2 aspect-video rounded-[18px] overflow-hidden bg-[#171717] border border-[#E7E6DF] relative flex items-center justify-center">
            <video
              ref={previewVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover -scale-x-100"
            />
          </div>
        </div>

        <div className="flex justify-end mt-1">
          <button
            onClick={() => setIsSettingsOpen(false)}
            className="px-6 py-2.5 rounded-[14px] text-xs font-bold uppercase tracking-wider bg-[#B7FF2A] hover:bg-[#A6EC1F] text-[#171717] tactile-btn shadow-[0_2px_8px_rgba(183,255,42,0.3)] transition-all cursor-pointer"
          >
            Concluir
          </button>
        </div>
      </div>
    </Modal>
  );
};
