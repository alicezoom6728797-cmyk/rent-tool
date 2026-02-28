import { create } from 'zustand';
import type { StationInfo, RouteInfo, ROUTE_COLORS } from '../types';

interface AppState {
  city: string;
  address: string;
  center: [number, number] | null;
  radius: number;
  stations: StationInfo[];
  selectedStation: StationInfo | null;
  routes: RouteInfo[];
  loading: boolean;
  colorIndex: number;

  setCity: (c: string) => void;
  setAddress: (addr: string) => void;
  setCenter: (c: [number, number]) => void;
  setRadius: (r: number) => void;
  setStations: (s: StationInfo[]) => void;
  setSelectedStation: (s: StationInfo | null) => void;
  addRoute: (r: RouteInfo) => void;
  removeRoute: (id: string) => void;
  toggleRouteVisible: (id: string) => void;
  clearRoutes: () => void;
  setLoading: (l: boolean) => void;
  nextColor: () => string;
}

const COLORS = [
  '#1677ff', '#52c41a', '#fa541c', '#722ed1',
  '#eb2f96', '#faad14', '#13c2c2', '#2f54eb',
];

export const useAppStore = create<AppState>((set, get) => ({
  city: '杭州',
  address: '',
  center: null,
  radius: 1000,
  stations: [],
  selectedStation: null,
  routes: [],
  loading: false,
  colorIndex: 0,

  setCity: (city) => set({ city }),
  setAddress: (address) => set({ address }),
  setCenter: (center) => set({ center }),
  setRadius: (radius) => set({ radius }),
  setStations: (stations) => set({ stations }),
  setSelectedStation: (selectedStation) => set({ selectedStation }),
  addRoute: (route) =>
    set((s) => ({
      routes: [...s.routes, route],
    })),
  removeRoute: (id) =>
    set((s) => ({
      routes: s.routes.filter((r) => r.id !== id),
    })),
  toggleRouteVisible: (id) =>
    set((s) => ({
      routes: s.routes.map((r) =>
        r.id === id ? { ...r, visible: !r.visible } : r
      ),
    })),
  clearRoutes: () => set({ routes: [], colorIndex: 0 }),
  setLoading: (loading) => set({ loading }),
  nextColor: () => {
    const idx = get().colorIndex;
    set({ colorIndex: (idx + 1) % COLORS.length });
    return COLORS[idx % COLORS.length];
  },
}));
