import { useEffect, useState, type ReactNode } from 'react';
import type { LatLngBoundsExpression } from 'leaflet';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { CloudRain } from 'lucide-react';
import type { LatLng } from '../../lib/geo';

export const THAILAND_BOUNDS: LatLngBoundsExpression = [
  [5.6, 97.3],
  [20.5, 105.7],
];

type BasemapId = 'satellite' | 'terrain' | 'streets';

const BASEMAPS: Record<
  BasemapId,
  { label: string; icon: string; url: string; attribution: string; maxZoom: number; labelsUrl?: string }
> = {
  satellite: {
    label: 'ภาพดาวเทียม',
    icon: '🛰️',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    labelsUrl:
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Esri, Maxar, Earthstar Geographics',
    maxZoom: 18,
  },
  terrain: {
    label: 'ภูมิประเทศ',
    icon: '⛰️',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution:
      'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Style &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
    maxZoom: 17,
  },
  streets: {
    label: 'แผนที่ถนน',
    icon: '🗺️',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
};

// Latest RainViewer radar frame (free public API); null until loaded or if unavailable
function useRainRadarTileUrl(enabled: boolean) {
  const [tileUrl, setTileUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled || tileUrl) return;
    let cancelled = false;
    fetch('https://api.rainviewer.com/public/weather-maps.json')
      .then((r) => r.json())
      .then((data) => {
        const frames = data?.radar?.past;
        if (cancelled || !data?.host || !frames?.length) return;
        setTileUrl(`${data.host}${frames[frames.length - 1].path}/256/{z}/{x}/{y}/2/1_1.png`);
      })
      .catch(() => {
        // Radar is optional; leave the layer hidden if the API is unreachable
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, tileUrl]);
  return tileUrl;
}

function ClickHandler({ onClick }: { onClick: (p: LatLng) => void }) {
  useMapEvents({ click: (e) => onClick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

function FocusController({ focus }: { focus: (LatLng & { zoom?: number }) | null | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (focus) map.setView([focus.lat, focus.lng], focus.zoom ?? Math.max(map.getZoom(), 14));
  }, [focus?.lat, focus?.lng, focus?.zoom, map]);
  return null;
}

interface BaseMapProps {
  children?: ReactNode;
  /** Height and extra classes for the map box. */
  className?: string;
  onMapClick?: (p: LatLng) => void;
  focus?: (LatLng & { zoom?: number }) | null;
}

export function BaseMap({ children, className = 'h-[420px]', onMapClick, focus }: BaseMapProps) {
  const [basemap, setBasemap] = useState<BasemapId>('streets');
  const [showRadar, setShowRadar] = useState(false);
  const radarTileUrl = useRainRadarTileUrl(showRadar);
  const active = BASEMAPS[basemap];

  return (
    <div className={`relative isolate w-full overflow-hidden rounded-xl border border-slate-800 bg-[#070d18] ${className}`}>
      <MapContainer
        bounds={THAILAND_BOUNDS}
        minZoom={5}
        zoomSnap={0.25}
        scrollWheelZoom={false}
        className="h-full w-full"
        style={{ background: '#070d18' }}
      >
        {/* key forces a clean swap of tile sources when the basemap changes */}
        <TileLayer key={basemap} url={active.url} attribution={active.attribution} maxZoom={active.maxZoom} zIndex={1} />
        {active.labelsUrl && (
          <TileLayer key={`${basemap}-labels`} url={active.labelsUrl} maxZoom={active.maxZoom} zIndex={2} />
        )}
        {showRadar && radarTileUrl && (
          <TileLayer
            url={radarTileUrl}
            opacity={0.6}
            maxNativeZoom={7}
            zIndex={3}
            attribution='Radar &copy; <a href="https://www.rainviewer.com">RainViewer</a>'
          />
        )}
        {onMapClick && <ClickHandler onClick={onMapClick} />}
        <FocusController focus={focus} />
        {children}
      </MapContainer>

      <div className="absolute right-2 top-2 z-[1000] flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-1 rounded-xl border border-slate-700/80 bg-slate-900/90 p-1 shadow-lg backdrop-blur-md">
          {(Object.keys(BASEMAPS) as BasemapId[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setBasemap(id)}
              aria-pressed={basemap === id}
              className={`flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1 text-[11px] transition-colors sm:px-3 sm:py-1.5 sm:text-xs ${
                basemap === id ? 'bg-cyan-600 font-semibold text-white shadow' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span aria-hidden>{BASEMAPS[id].icon}</span>
              <span>{BASEMAPS[id].label}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowRadar((v) => !v)}
          aria-pressed={showRadar}
          className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] shadow-lg backdrop-blur-md ${
            showRadar ? 'border-emerald-500/60 bg-emerald-950/80 text-emerald-300' : 'border-slate-700 bg-slate-900/90 text-slate-300'
          }`}
        >
          <CloudRain className="h-3 w-3" />
          เรดาร์ฝน
        </button>
      </div>
    </div>
  );
}
