import { create } from 'zustand';
import type { StationInfo, LineInfo } from '../types';

const COLORS = [
  '#1677ff', '#52c41a', '#fa541c', '#722ed1',
  '#eb2f96', '#faad14', '#13c2c2', '#2f54eb',
  '#f5222d', '#a0d911', '#1890ff', '#fa8c16',
];

interface AppState {
  city: string;
  address: string;
  center: [number, number] | null;
  radius: number;
  stations: StationInfo[];
  lines: LineInfo[];
  loading: boolean;
  linesLoading: boolean;
  colorIndex: number;

  setCity: (c: string) => void;
  setAddress: (addr: string) => void;
  setCenter: (c: [number, number]) => void;
  setRadius: (r: number) => void;
  setStations: (s: StationInfo[]) => void;
  setLines: (l: LineInfo[]) => void;
  updateLine: (id: string, patch: Partial<LineInfo>) => void;
  toggleLineVisible: (id: string) => void;
  setLoading: (l: boolean) => void;
  setLinesLoading: (l: boolean) => void;
  reset: () => void;
  nextColor: () => string;
}

export const useAppStore = create<AppState>((set, get) => ({
  city: '杭州',
  address: '',
  center: null,
  radius: 1000,
  stations: [],
  lines: [],
  loading: false,
  linesLoading: false,
  colorIndex: 0,

  setCity: (city) => set({ city }),
  setAddress: (address) => set({ address }),
  setCenter: (center) => set({ center }),
  setRadius: (radius) => set({ radius }),
  setStations: (stations) => set({ stations }),
  setLines: (lines) => set({ lines }),
  updateLine: (id, patch) => set((s) => ({
    lines: s.lines.map((l) => l.id === id ? { ...l, ...patch } : l),
  })),
  toggleLineVisible: (id) => set((s) => ({
    lines: s.lines.map((l) => l.id === id ? { ...l, visible: !l.visible } : l),
  })),
  setLoading: (loading) => set({ loading }),
  setLinesLoading: (linesLoading) => set({ linesLoading }),
  reset: () => set({ stations: [], lines: [], colorIndex: 0, linesLoading: false }),
  nextColor: () => {
    const idx = get().colorIndex;
    set({ colorIndex: (idx + 1) % COLORS.length });
    return COLORS[idx % COLORS.length];
  },
}));
