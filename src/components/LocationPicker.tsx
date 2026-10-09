import { useState } from 'react';
import { CircleMarker } from 'react-leaflet';
import type { LatLng } from '../lib/geo';
import { BaseMap } from './map/BaseMap';

type GpsState = 'idle' | 'locating' | 'denied' | 'unavailable';

export function LocationPicker({ value, onChange }: { value: LatLng | null; onChange: (p: LatLng) => void }) {
  const [gps, setGps] = useState<GpsState>('idle');
  const [focus, setFocus] = useState<(LatLng & { zoom?: number }) | null>(null);

  const locate = () => {
    if (!navigator.geolocation) return setGps('unavailable');
    setGps('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        onChange(p);
        setFocus({ ...p, zoom: 16 });
        setGps('idle');
      },
      (err) => setGps(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={locate}
        disabled={gps === 'locating'}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 text-sm font-bold text-white hover:bg-cyan-500 disabled:opacity-60"
      >
        📍 {gps === 'locating' ? 'กำลังหาตำแหน่ง...' : 'ใช้ตำแหน่งปัจจุบันของฉัน'}
      </button>
      {gps === 'denied' && <p className="text-xs text-amber-300">ไม่ได้รับอนุญาตให้ใช้ตำแหน่ง แตะบนแผนที่เพื่อปักหมุดแทน</p>}
      {gps === 'unavailable' && <p className="text-xs text-amber-300">หาตำแหน่งไม่ได้ แตะบนแผนที่เพื่อปักหมุดแทน</p>}
      <BaseMap className="h-72" onMapClick={onChange} focus={focus}>
        {value && (
          <CircleMarker
            center={[value.lat, value.lng]}
            radius={11}
            pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#ef4444', fillOpacity: 1 }}
          />
        )}
      </BaseMap>
      <p className="text-xs text-slate-400">
        {value
          ? `ตำแหน่งที่เลือก ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)} (แตะแผนที่เพื่อเปลี่ยน)`
          : 'แตะบนแผนที่เพื่อปักหมุดตำแหน่ง'}
      </p>
    </div>
  );
}
