import AMapLoader from '@amap/amap-jsapi-loader';

const AMAP_KEY = '840c47d82756ee054946bd79bf320f4e';
const AMAP_SECRET = '2c259b4a7069d070929b23ca15cb5361';

let mapInstance: any = null;
let AMapGlobal: any = null;

export async function initAMap(container: string | HTMLElement): Promise<any> {
  (window as any)._AMapSecurityConfig = {
    securityJsCode: AMAP_SECRET,
  };
  AMapGlobal = await AMapLoader.load({
    key: AMAP_KEY,
    version: '1.4.15',
    plugins: [
      'AMap.Geocoder',
      'AMap.PlaceSearch',
      'AMap.Walking',
      'AMap.AutoComplete',
      'AMap.LineSearch',
      'AMap.StationSearch',
    ],
  });
  mapInstance = new AMapGlobal.Map(container, {
    zoom: 14,
    center: [116.397428, 39.90923],
    viewMode: '2D',
  });
  return { map: mapInstance, AMap: AMapGlobal };
}

export function getAMap() {
  return AMapGlobal;
}

export function getMap() {
  return mapInstance;
}
