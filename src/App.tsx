import React, { useEffect } from 'react';
import { Sidebar } from './components/sidebar/Sidebar';
import { CenterArea } from './components/layout/CenterArea';
import { ChatPanel } from './components/layout/ChatPanel';
import { Toast } from './components/common/Toast';
import { NameModal } from './components/common/NameModal';
import { SettingsModal } from './components/common/SettingsModal';
import { SoundUnlockButton } from './components/common/SoundUnlockButton';
import { LoginView } from './components/common/LoginView';
import { useHubStore } from './stores/hubStore';
import { useRoomStore } from './stores/roomStore';
import { useUIStore } from './stores/uiStore';
import { signalingClient } from './signaling/client';
import { webRtcMesh } from './rtc/Mesh';

export const App: React.FC = () => {
  const { isAuthenticated, initIdentity, setWelcome, updateRoomsState, setConnectionStatus } = useHubStore();
  const { setRoomJoined, updateRoomState, addChatMessage } = useRoomStore();
  const { addToast } = useUIStore();

  useEffect(() => {
    // 1. Inicializa identidade e mesh
    initIdentity();
    webRtcMesh.init();

    // 2. Ouvintes de status e sinalização do WebSocket
    const unsubStatus = signalingClient.onStatus((status) => {
      setConnectionStatus(status);
    });

    const unsubMsg = signalingClient.onMessage((msg) => {
      switch (msg.type) {
        case 'welcome': {
          setWelcome(msg.selfId, msg.self, msg.rooms);
          break;
        }
        case 'rooms-state': {
          updateRoomsState(msg.rooms);
          break;
        }
        case 'room-joined': {
          setRoomJoined(msg.room, msg.history);
          break;
        }
        case 'room-state': {
          updateRoomState(msg.room);
          break;
        }
        case 'join-denied': {
          if (msg.reason === 'room-full') {
            addToast('Esta sala atingiu a capacidade máxima de participantes.', 'error');
          } else {
            addToast('Não foi possível entrar na sala selecionada.', 'error');
          }
          break;
        }
        case 'chat-message': {
          addChatMessage(msg.message);
          break;
        }
        case 'error': {
          addToast(msg.message, 'error');
          break;
        }
      }
    });

    // 3. Se já autenticado, conecta imediatamente
    if (isAuthenticated) {
      signalingClient.connect();
    }

    return () => {
      unsubStatus();
      unsubMsg();
      signalingClient.disconnect();
    };
  }, [isAuthenticated]);

  // Se não estiver autenticado, exibe a tela de login
  if (!isAuthenticated) {
    return <LoginView />;
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#F7F6F0] selection:bg-[#171717] selection:text-white">
      {/* Barra Lateral Esquerda: Salas + Status Online + Controles de Voz embutidos (100% de altura, até a base) */}
      <Sidebar />

      {/* Área Central: Cabeçalho da Sala + Grade Responsiva */}
      <CenterArea />

      {/* Barra Lateral Direita: Chat ocupando toda a altura até a base */}
      <ChatPanel />

      {/* Overlays */}
      <Toast />
      <NameModal />
      <SettingsModal />
      <SoundUnlockButton />
    </div>
  );
};

export default App;
