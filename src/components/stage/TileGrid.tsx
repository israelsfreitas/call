import React, { useEffect } from 'react';
import { useRoomStore } from '../../stores/roomStore';
import { useLocalMediaStore } from '../../stores/localMediaStore';
import { useHubStore } from '../../stores/hubStore';
import { useUIStore } from '../../stores/uiStore';
import { ParticipantTile } from './ParticipantTile';
import { ScreenTile } from './ScreenTile';
import { webRtcMesh } from '../../rtc/Mesh';

export const TileGrid: React.FC = () => {
  const { currentRoom, peerMedia } = useRoomStore();
  const { cameraStream, screenStream, isSpeaking: localSpeaking } = useLocalMediaStore();
  const { selfId } = useHubStore();
  const { spotlightTileId, setSpotlightTileId } = useUIStore();

  if (!currentRoom) return null;

  useEffect(() => {
    if (!spotlightTileId) {
      const screenSharer = currentRoom.participants.find(p => p.screen);
      if (screenSharer) {
        setSpotlightTileId(`${screenSharer.id}:screen`);
      }
    }
  }, [currentRoom.participants, spotlightTileId, setSpotlightTileId]);

  const participants = currentRoom.participants;

  type TileItem =
    | { type: 'participant'; id: string; participant: typeof participants[0]; isSelf: boolean }
    | { type: 'screen'; id: string; peerId: string; authorName: string; isSelf: boolean; hasAudio: boolean };

  const tiles: TileItem[] = [];

  participants.forEach(p => {
    tiles.push({
      type: 'participant',
      id: p.id,
      participant: p,
      isSelf: p.id === selfId
    });
  });

  participants.forEach(p => {
    if (p.screen) {
      tiles.push({
        type: 'screen',
        id: `${p.id}:screen`,
        peerId: p.id,
        authorName: p.name,
        isSelf: p.id === selfId,
        hasAudio: p.screenAudio
      });
    }
  });

  const isSpotlightActive = !!spotlightTileId && tiles.some(t => t.id === spotlightTileId);
  const spotlightTile = isSpotlightActive ? tiles.find(t => t.id === spotlightTileId) : null;
  const nonSpotlightTiles = isSpotlightActive ? tiles.filter(t => t.id !== spotlightTileId) : tiles;

  const renderTile = (tile: TileItem) => {
    if (tile.type === 'participant') {
      const p = tile.participant;
      const isSelf = tile.isSelf;
      const vStream = isSelf ? cameraStream : (peerMedia[p.id]?.cameraStream || null);
      const aStream = isSelf ? null : (peerMedia[p.id]?.audioStream || null);
      const speaking = isSelf ? localSpeaking : (peerMedia[p.id]?.isSpeaking || false);

      return (
        <ParticipantTile
          key={tile.id}
          participant={p}
          isSelf={isSelf}
          videoStream={vStream}
          audioStream={aStream}
          isSpeaking={speaking}
          isSpotlight={spotlightTileId === tile.id}
          onToggleSpotlight={() => {
            setSpotlightTileId(spotlightTileId === tile.id ? null : tile.id);
          }}
          onVisibilityChange={(isVisible) => {
            if (!isSelf) {
              webRtcMesh.sendSubscription(p.id, isVisible, true);
            }
          }}
        />
      );
    } else {
      const isSelf = tile.isSelf;
      const vStream = isSelf ? screenStream : (peerMedia[tile.peerId]?.screenStream || null);
      const aStream = isSelf ? null : (peerMedia[tile.peerId]?.screenAudioStream || null);

      return (
        <ScreenTile
          key={tile.id}
          peerId={tile.peerId}
          authorName={tile.authorName}
          isSelf={isSelf}
          videoStream={vStream}
          audioStream={aStream}
          hasAudioTrack={tile.hasAudio}
          isSpotlight={spotlightTileId === tile.id}
          onToggleSpotlight={() => {
            setSpotlightTileId(spotlightTileId === tile.id ? null : tile.id);
          }}
        />
      );
    }
  };

  return (
    <div className="flex-1 w-full h-full p-4 sm:p-6 overflow-y-auto">
      {isSpotlightActive && spotlightTile ? (
        /* Modo Foco / Spotlight: 1 quadro destacado + faixa de miniaturas */
        <div className="flex flex-col gap-4 h-full">
          <div className="flex-1 min-h-0 flex items-center justify-center">
            <div className="w-full h-full max-w-5xl">
              {renderTile(spotlightTile)}
            </div>
          </div>
          {/* Faixa inferior de miniaturas clicáveis para alternar foco */}
          {nonSpotlightTiles.length > 0 && (
            <div className="flex gap-3 overflow-x-auto pb-2 shrink-0 h-32 sm:h-36">
              {nonSpotlightTiles.map(t => (
                <div key={t.id} className="w-48 sm:w-56 h-full shrink-0">
                  {renderTile(t)}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Modo Grade Lado a Lado: Todos os quadros distribuídos responsivamente */
        <div className={`grid gap-4 max-w-6xl mx-auto ${
          tiles.length === 1
            ? 'grid-cols-1 max-w-3xl'
            : tiles.length === 2
            ? 'grid-cols-1 md:grid-cols-2'
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        }`}>
          {tiles.map(t => renderTile(t))}
        </div>
      )}
    </div>
  );
};
