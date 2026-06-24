import * as L from 'leaflet';

if (typeof window !== 'undefined') {
  const leafletObj = (L as any).default || L;
  if (Object.isFrozen(leafletObj)) {
    const mutableL: any = { ...leafletObj };
    Object.setPrototypeOf(mutableL, Object.getPrototypeOf(leafletObj));
    (window as any).L = mutableL;
  } else {
    (window as any).L = leafletObj;
  }
}