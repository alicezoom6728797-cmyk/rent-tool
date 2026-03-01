// 周边站点
export interface StationInfo {
  id: string;
  name: string;
  location: [number, number];
  type: 'subway' | 'bus';
  distance: number;
}

// 聚合后的线路（去重后）
export interface LineInfo {
  id: string;
  name: string;
  type: 'subway' | 'bus';
  nearestStation: string;   // 最近的站点名
  nearestDistance: number;   // 最近站点距离(m)
  startStop: string;
  endStop: string;
  startTime: string;
  endTime: string;
  interval: string;
  stops: StopInfo[];
  path: [number, number][];
  color: string;
  visible: boolean;
  loaded: boolean;  // 是否已加载完整路线数据
}

export interface StopInfo {
  name: string;
  location?: [number, number];
  sequence: number;
}
