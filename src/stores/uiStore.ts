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

  initTheme: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
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

const getInitialTheme = (): 'dark' | 'light' => {
  if (typeof window === 'undefined') return 'dark';
  const saved = localStorage.getItem('call_theme') || localStorage.getItem('vox_theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const applyThemeToDOM = (theme: 'dark' | 'light') => {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

const initialTheme = getInitialTheme();
if (typeof document !== 'undefined') {
  applyThemeToDOM(initialTheme);
}

export const useUIStore = create<UIState>((set, get) => ({
  theme: initialTheme,
  sidebarCollapsed: localStorage.getItem('vox_sidebar_collapsed') === 'true',
  chatHidden: localStorage.getItem('vox_chat_hidden') === 'true',
  spotlightTileId: null,
  soundUnlockNeeded: false,
  isSettingsOpen: false,
  isNameModalOpen: false,
  toasts: [],

  initTheme: () => {
    const current = get().theme;
    applyThemeToDOM(current);
  },

  setTheme: (theme: 'dark' | 'light') => {
    localStorage.setItem('call_theme', theme);
    localStorage.setItem('vox_theme', theme);
    applyThemeToDOM(theme);
    set({ theme });
  },

  toggleTheme: () => {
    const nextTheme = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('call_theme', nextTheme);
    localStorage.setItem('vox_theme', nextTheme);
    applyThemeToDOM(nextTheme);
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
