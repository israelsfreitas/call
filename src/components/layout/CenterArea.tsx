import React from 'react';
import { useRoomStore } from '../../stores/roomStore';
import { RoomHeader } from '../stage/RoomHeader';
import { EmptyState } from '../stage/EmptyState';
import { TileGrid } from '../stage/TileGrid';

export const CenterArea: React.FC = () => {
  const { currentRoom } = useRoomStore();

  return (
    <main className="flex-1 h-full flex flex-col relative overflow-hidden bg-[#F7F6F0] dark:bg-[#0F0F0E] z-10 transition-colors duration-200">
      {currentRoom ? (
        <>
          <RoomHeader />
          <TileGrid />
        </>
      ) : (
        <EmptyState />
      )}
    </main>
  );
};
