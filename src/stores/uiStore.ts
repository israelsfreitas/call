import { create } from 'zustand';

interface ToastItem {
  id: string;
  message: string;
  type?: 'info' | 'error' | 'success';
}

interface UIState {
  theme: 'dark' | 'light';
  sidebarCollapsed: boolean;
  chatHidden: boolean;
  spotlightTileId: string | null; // peerId ou peerId + ':screen'
  soundUnlockNeeded: boolean;
  isSettingsOpen: boolean;
  isNameModalOpen: boolean;
  toasts: ToastItem[];

  toggleTheme: () => void;
  toggleSidebar: () => void;
  toggleChat: () => void;
  setSpotlightTileId: (id: string | null) => void;
  setSoundUnlockNeeded: (needed: boolean) => void;
  setIsSettingsOpen: (open: boolean) => void;
  setIsNameModalOpen: (open: boolean) => void;
  addToast: (message: string, type?: 'info' | 'error' | 'success') => void;
  removeToast: (id: string) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  theme: (localStorage.getItem('vox_theme') as 'dark' | 'light') || 'dark',
  sidebarCollapsed: localStorage.getItem('vox_sidebar_collapsed') === 'true',
  chatHidden: localStorage.getItem('vox_chat_hidden') === 'true',
  spotlightTileId: null,
  soundUnlockNeeded: false,
  isSettingsOpen: false,
  isNameModalOpen: false,
  toasts: [],

  toggleTheme: () => {
    const nextTheme = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('vox_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    set({ theme: nextTheme });
  },

  toggleSidebar: () => {
    const nextVal = !get().sidebarCollapsed;
    localStorage.setItem('vox_sidebar_collapsed', String(nextVal));
    set({ sidebarCollapsed: nextVal });
  },

  toggleChat: () => {
    const nextVal = !get().chatHidden;
    localStorage.setItem('vox_chat_hidden', String(nextVal));
    set({ chatHidden: nextVal });
  },

  setSpotlightTileId: (spotlightTileId) => set({ spotlightTileId }),
  setSoundUnlockNeeded: (soundUnlockNeeded) => set({ soundUnlockNeeded }),
  setIsSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),
  setIsNameModalOpen: (isNameModalOpen) => set({ isNameModalOpen }),

  addToast: (message, type = 'info') => {
    // Evita acumular toasts idênticos repetidos
    const current = get().toasts;
    if (current.some(t => t.message === message)) return;

    const id = crypto.randomUUID();
    set(state => ({ toasts: [...state.toasts.slice(-2), { id, message, type }] }));
    setTimeout(() => {
      get().removeToast(id);
    }, 4000);
  },

  removeToast: (id) => {
    set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }));
  }
}));
