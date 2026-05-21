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

const defaultPerfOpen =
  typeof import.meta !== 'undefined' && import.meta.env.DEV ? localStorage.getItem('locate-perf-panel') !== '0' : false;

export const useRoomSettingsStore = create<RoomSettings>((set) => ({
  showTrails: true,
  perfPanelOpen: defaultPerfOpen,
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
