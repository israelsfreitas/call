import React, { useState } from 'react';
import { Modal } from './Modal';
import { useHubStore } from '../../stores/hubStore';
import { useUIStore } from '../../stores/uiStore';

export const NameModal: React.FC = () => {
  const { name, setName } = useHubStore();
  const { isNameModalOpen, setIsNameModalOpen } = useUIStore();
  const [tempName, setTempName] = useState(name);

  React.useEffect(() => {
    if (isNameModalOpen) {
      setTempName(name);
    }
  }, [isNameModalOpen, name]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempName.trim()) {
      setName(tempName.trim());
      setIsNameModalOpen(false);
    }
  };

  return (
    <Modal
      isOpen={isNameModalOpen}
      onClose={() => setIsNameModalOpen(false)}
      title="Editar seu Nome"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-semibold text-[#171717] dark:text-[#F5F5F0] mb-2">
            Nome de exibição
          </label>
          <input
            type="text"
            value={tempName}
            maxLength={24}
            onChange={(e) => setTempName(e.target.value)}
            placeholder="Digite seu nome (1 a 24 caracteres)"
            className="w-full px-3.5 py-2.5 rounded-[14px] bg-[#F7F6F0] dark:bg-[#242422] border border-[#E7E6DF] dark:border-[#2A2A28] text-[#171717] dark:text-[#F5F5F0] placeholder-[#92928A] dark:placeholder-[#73736C] focus:outline-none focus:border-[#171717] dark:focus:border-[#B7FF2A] text-sm transition-colors"
            autoFocus
          />
        </div>

        <div className="flex justify-end gap-3 mt-1">
          <button
            type="button"
            onClick={() => setIsNameModalOpen(false)}
            className="px-4 py-2.5 rounded-[12px] bg-[#EFEEE8] dark:bg-[#242422] hover:bg-[#E7E6DF] dark:hover:bg-[#2E2E2C] text-[#171717] dark:text-[#F5F5F0] text-xs font-semibold tracking-tight transition-colors tactile-btn cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!tempName.trim()}
            className="px-6 py-2.5 rounded-[14px] text-xs font-bold uppercase tracking-wider bg-[#B7FF2A] hover:bg-[#A6EC1F] text-[#171717] tactile-btn shadow-[0_2px_8px_rgba(183,255,42,0.3)] disabled:opacity-40 transition-all cursor-pointer"
          >
            Salvar
          </button>
        </div>
      </form>
    </Modal>
  );
};
