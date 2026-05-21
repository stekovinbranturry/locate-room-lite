import { create } from 'zustand';

export type WeakNetMode = 'auto' | 'on' | 'off';

type RoomSettings = {
  showTrails: boolean;
  perfPanelOpen: boolean;
  weakNetMode: WeakNetMode;

  setShowTrails: (v: boolean) => void;
  setPerfPanelOpen: (v: boolean) => void;
  setWeakNetMode: (m: WeakNetMode) => void;
};

function readPerfPanelOpen(): boolean {
  if (typeof window === 'undefined') return false;
  if (import.meta.env.DEV) return localStorage.getItem('locate-perf-panel') !== '0';
  return localStorage.getItem('locate-perf-panel') === '1';
}

export const useRoomSettingsStore = create<RoomSettings>((set) => ({
  showTrails: true,
  perfPanelOpen: readPerfPanelOpen(),
  weakNetMode: 'auto',

  setShowTrails: (showTrails) => set({ showTrails }),
  setPerfPanelOpen: (perfPanelOpen) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('locate-perf-panel', perfPanelOpen ? '1' : '0');
    }
    set({ perfPanelOpen });
  },
  setWeakNetMode: (weakNetMode) => set({ weakNetMode }),
}));
