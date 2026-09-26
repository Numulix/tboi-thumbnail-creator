import React, { useMemo, useState } from 'react';
import {
  getRoomBackdropById,
  listRoomBackdrops,
  type RoomCategory,
} from '../catalog/roomCatalog';

export interface RoomDrawerProps {
  activeStageId: string;
  onSelectStage: (stageId: string, category: RoomCategory) => void;
}

export function RoomDrawer({
  activeStageId,
  onSelectStage,
}: RoomDrawerProps): React.ReactElement {
  const [activeCategory, setActiveCategory] = useState<RoomCategory>(
    () => getRoomBackdropById(activeStageId).category
  );

  const categoryRooms = useMemo(
    () => listRoomBackdrops(activeCategory),
    [activeCategory]
  );

  const handleSelect = (stageId: string, category: RoomCategory) => {
    setActiveCategory(category);
    onSelectStage(stageId, category);
  };

  return (
    <section
      data-testid="stage-catalog-section"
      className="space-y-2.5"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#9E95A8]">
          Repentance+ Stage Catalog
        </span>
        <span className="text-[11px] font-mono-tabular text-[#E5A93C]">
          CORS-Free
        </span>
      </div>

      {/* Category Tabs: Main Path, Alt Path, Special Rooms */}
      <div className="grid grid-cols-3 gap-1 bg-[#0D0B0E] p-1 rounded border border-[#2A252D] text-[11px]">
        <button
          type="button"
          onClick={() => setActiveCategory('main')}
          className={`py-1 px-1.5 rounded font-semibold transition-colors cursor-pointer ${
            activeCategory === 'main'
              ? 'bg-[#E5A93C] text-[#110F13] font-bold'
              : 'text-[#9E95A8] hover:text-[#F4EFEA]'
          }`}
        >
          Main Path
        </button>
        <button
          type="button"
          onClick={() => setActiveCategory('alt')}
          className={`py-1 px-1.5 rounded font-semibold transition-colors cursor-pointer ${
            activeCategory === 'alt'
              ? 'bg-[#E5A93C] text-[#110F13] font-bold'
              : 'text-[#9E95A8] hover:text-[#F4EFEA]'
          }`}
        >
          Alt Path
        </button>
        <button
          type="button"
          onClick={() => setActiveCategory('special')}
          className={`py-1 px-1.5 rounded font-semibold transition-colors cursor-pointer ${
            activeCategory === 'special'
              ? 'bg-[#E5A93C] text-[#110F13] font-bold'
              : 'text-[#9E95A8] hover:text-[#F4EFEA]'
          }`}
        >
          Special Rooms
        </button>
      </div>

      {/* Bundled Stage Cards */}
      <div className="space-y-1.5">
        {categoryRooms.map((room) => {
          const isSelected = room.id === activeStageId;
          return (
            <button
              key={room.id}
              type="button"
              onClick={() => handleSelect(room.id, room.category)}
              className={`w-full p-2 rounded border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#231F28] border-[#E5A93C] shadow-sm'
                  : 'bg-[#0D0B0E] border-[#2A252D] hover:bg-[#231F28]/60'
              }`}
            >
              <img
                src={room.textureDataUrl}
                alt={room.name}
                className="w-14 h-8 rounded-xs border border-[#2A252D] object-cover pixelated shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-[#F4EFEA] truncate">
                    {room.name}
                  </span>
                  {isSelected && (
                    <span className="text-[10px] font-mono-tabular font-bold px-1.5 py-0.5 rounded bg-[#E5A93C]/20 text-[#E5A93C]">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-[#9E95A8] truncate mt-0.5">
                  {room.subtitle}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
