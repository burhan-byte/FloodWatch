import React, { useEffect, useState } from 'react';
import L, { LatLngBoundsExpression } from 'leaflet';
import { MapContainer, TileLayer, CircleMarker, Circle, Marker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { GaugingStation, FloodAlertZone, DamStatus, EvacuationShelter, SeverityLevel } from '../types/flood';
import { CloudRain, ShieldAlert, Compass, Info, ChevronRight, Activity } from 'lucide-react';

interface GisFloodMapProps {
  stations: GaugingStation[];
  alertZones: FloodAlertZone[];
  dams: DamStatus[];
  shelters: EvacuationShelter[];
  onSelectStation: (st: GaugingStation) => void;
  onSelectAlertZone: (zone: FloodAlertZone) => void;
}

type RegionPreset = 'all' | 'central' | 'north' | 'northeast' | 'south';
type BasemapId = 'satellite' | 'terrain' | 'streets';

const REGION_BOUNDS: Record<RegionPreset, LatLngBoundsExpression> = {
  all: [[5.6, 97.3], [20.5, 105.7]],
  central: [[13.4, 99.6], [16.0, 101.3]],
  north: [[15.8, 97.5], [20.5, 101.5]],
  northeast: [[14.0, 101.5], [18.5, 105.7]],
  south: [[5.6, 98.0], [11.0, 102.2]],
};

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

const SEVERITY_COLOR: Record<SeverityLevel, string> = {
  critical: '#ef4444',
  warning: '#f97316',
  watch: '#eab308',
  normal: '#10b981',
};

const SEVERITY_LABEL: Record<SeverityLevel, string> = {
  critical: 'ล้นตลิ่ง',
  warning: 'เตือนภัย',
  watch: 'เฝ้าระวัง',
  normal: 'ปกติ',
};

const damIcon = L.divIcon({
  className: '',
  html: '<div style="width:12px;height:12px;background:#6366f1;border:2px solid #c7d2fe;border-radius:3px"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

// Fly to the selected region whenever the preset changes
const RegionFitter: React.FC<{ region: RegionPreset }> = ({ region }) => {
  const map = useMap();
  useEffect(() => {
    map.flyToBounds(REGION_BOUNDS[region], { duration: 0.8 });
  }, [region, map]);
  return null;
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
        const latest = frames[frames.length - 1];
        setTileUrl(`${data.host}${latest.path}/256/{z}/{x}/{y}/2/1_1.png`);
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

export const GisFloodMap: React.FC<GisFloodMapProps> = ({
  stations,
  alertZones,
  dams,
  shelters,
  onSelectStation,
  onSelectAlertZone,
}) => {
  const [region, setRegion] = useState<RegionPreset>('all');
  const [basemap, setBasemap] = useState<BasemapId>('satellite');
  const [showStations, setShowStations] = useState(true);
  const [showAlerts, setShowAlerts] = useState(true);
  const [showDams, setShowDams] = useState(true);
  const [showRadar, setShowRadar] = useState(true);
  const [showShelters, setShowShelters] = useState(false);
  const [hoveredStationId, setHoveredStationId] = useState<string | null>(null);
  const [hoveredAlert, setHoveredAlert] = useState<FloodAlertZone | null>(null);

  const hoveredStation = stations.find((s) => s.id === hoveredStationId) ?? null;
  const radarTileUrl = useRainRadarTileUrl(showRadar);
  const activeBasemap = BASEMAPS[basemap];

  return (
    <div className="relative w-full bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Top Map Toolbar */}
      <div className="p-3 sm:p-4 bg-slate-900/95 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 z-10">
        {/* Region selector tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <span className="text-xs text-slate-400 font-medium mr-1 flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            ภูมิภาค:
          </span>
          {(
            [
              { id: 'all', label: 'ทั่วประเทศ' },
              { id: 'central', label: 'ลุ่มน้ำเจ้าพระยา/กลาง' },
              { id: 'north', label: 'ภาคเหนือ' },
              { id: 'northeast', label: 'ภาคอีสาน (ชี-มูล)' },
              { id: 'south', label: 'ภาคใต้' },
            ] as const
          ).map((reg) => (
            <button
              key={reg.id}
              onClick={() => setRegion(reg.id)}
              className={`px-2.5 py-1 text-xs rounded transition-all whitespace-nowrap cursor-pointer ${
                region === reg.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-medium'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-800/60 border border-transparent'
              }`}
            >
              {reg.label}
            </button>
          ))}
        </div>

        {/* Layer Switches */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <button
            onClick={() => setShowStations((v) => !v)}
            className={`px-2 py-1 rounded border flex items-center gap-1 transition-colors cursor-pointer ${
              showStations
                ? 'bg-blue-950/60 border-blue-500/50 text-blue-300'
                : 'bg-slate-800/40 border-slate-700 text-slate-500'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span>สถานีโทรมาตร</span>
          </button>

          <button
            onClick={() => setShowAlerts((v) => !v)}
            className={`px-2 py-1 rounded border flex items-center gap-1 transition-colors cursor-pointer ${
              showAlerts
                ? 'bg-red-950/60 border-red-500/50 text-red-300'
                : 'bg-slate-800/40 border-slate-700 text-slate-500'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>โซนเตือนภัย</span>
          </button>

          <button
            onClick={() => setShowDams((v) => !v)}
            className={`px-2 py-1 rounded border flex items-center gap-1 transition-colors cursor-pointer ${
              showDams
                ? 'bg-indigo-950/60 border-indigo-500/50 text-indigo-300'
                : 'bg-slate-800/40 border-slate-700 text-slate-500'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            <span>เขื่อน</span>
          </button>

          <button
            onClick={() => setShowRadar((v) => !v)}
            className={`px-2 py-1 rounded border flex items-center gap-1 transition-colors cursor-pointer ${
              showRadar
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                : 'bg-slate-800/40 border-slate-700 text-slate-500'
            }`}
          >
            <CloudRain className="w-3 h-3 text-emerald-400" />
            <span>เรดาร์ฝน</span>
          </button>

          <button
            onClick={() => setShowShelters((v) => !v)}
            className={`px-2 py-1 rounded border flex items-center gap-1 transition-colors cursor-pointer ${
              showShelters
                ? 'bg-amber-950/60 border-amber-500/50 text-amber-300'
                : 'bg-slate-800/40 border-slate-700 text-slate-500'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>ศูนย์พักพิง</span>
          </button>
        </div>
      </div>

      {/* Map Viewport Area */}
      <div className="relative isolate w-full h-[540px] sm:h-[620px] bg-[#070d18] overflow-hidden">
        <MapContainer
          bounds={REGION_BOUNDS.all}
          minZoom={5}
          zoomSnap={0.25}
          scrollWheelZoom={false}
          className="w-full h-full"
          style={{ background: '#070d18' }}
        >
          <RegionFitter region={region} />

          {/* key forces a clean swap of tile sources when the basemap changes */}
          <TileLayer
            key={basemap}
            url={activeBasemap.url}
            attribution={activeBasemap.attribution}
            maxZoom={activeBasemap.maxZoom}
            zIndex={1}
          />
          {activeBasemap.labelsUrl && (
            <TileLayer key={`${basemap}-labels`} url={activeBasemap.labelsUrl} maxZoom={activeBasemap.maxZoom} zIndex={2} />
          )}

          {/* Live rain radar overlay */}
          {showRadar && radarTileUrl && (
            <TileLayer
              url={radarTileUrl}
              opacity={0.6}
              maxNativeZoom={7}
              zIndex={3}
              attribution='Radar &copy; <a href="https://www.rainviewer.com">RainViewer</a>'
            />
          )}

          {/* Flood Inundation Risk Zones */}
          {showAlerts &&
            alertZones.map((zone) => {
              const isCritical = zone.riskLevel === 'critical';
              const color = SEVERITY_COLOR[zone.riskLevel];
              return (
                <Circle
                  key={zone.id}
                  center={[zone.lat, zone.lng]}
                  radius={isCritical ? 18000 : 12000}
                  pathOptions={{
                    color,
                    weight: 2,
                    fillColor: color,
                    fillOpacity: isCritical ? 0.35 : 0.25,
                    dashArray: isCritical ? undefined : '6 4',
                  }}
                  eventHandlers={{
                    click: () => onSelectAlertZone(zone),
                    mouseover: () => setHoveredAlert(zone),
                    mouseout: () => setHoveredAlert(null),
                  }}
                />
              );
            })}

          {/* Major Dams */}
          {showDams &&
            dams.map((dam) => (
              <Marker key={dam.id} position={[dam.lat, dam.lng]} icon={damIcon}>
                <Tooltip direction="right" offset={[8, 0]} className="fw-map-label">
                  {dam.name} ({dam.percentCapacity}%)
                </Tooltip>
              </Marker>
            ))}

          {/* Shelters */}
          {showShelters &&
            shelters.map((sh) => (
              <CircleMarker
                key={sh.id}
                center={[sh.lat, sh.lng]}
                radius={6}
                pathOptions={{ color: '#ffffff', weight: 1.5, fillColor: '#f59e0b', fillOpacity: 1 }}
              >
                <Tooltip direction="top" offset={[0, -6]} className="fw-map-label">
                  {sh.name}
                </Tooltip>
              </CircleMarker>
            ))}

          {/* Gauging Stations */}
          {showStations &&
            stations.map((st) => {
              const color = SEVERITY_COLOR[st.status];
              return (
                <CircleMarker
                  key={st.id}
                  center={[st.lat, st.lng]}
                  radius={st.status === 'critical' ? 8 : 6}
                  pathOptions={{ color, weight: 3, fillColor: '#0f172a', fillOpacity: 0.9 }}
                  eventHandlers={{
                    click: () => onSelectStation(st),
                    mouseover: () => setHoveredStationId(st.id),
                    mouseout: () => setHoveredStationId(null),
                  }}
                >
                  <Tooltip permanent direction="right" offset={[8, 0]} className="fw-map-label fw-map-label-mono">
                    {st.code}
                  </Tooltip>
                </CircleMarker>
              );
            })}
        </MapContainer>

        {/* Basemap Switcher */}
        <div className="absolute top-3 right-3 z-[1000] flex items-center gap-1 p-1 bg-slate-900/90 border border-slate-700/80 rounded-xl backdrop-blur-md shadow-lg">
          {(Object.keys(BASEMAPS) as BasemapId[]).map((id) => (
            <button
              key={id}
              onClick={() => setBasemap(id)}
              aria-pressed={basemap === id}
              className={`px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                basemap === id
                  ? 'bg-cyan-600 text-white font-semibold shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span aria-hidden>{BASEMAPS[id].icon}</span>
              <span>{BASEMAPS[id].label}</span>
            </button>
          ))}
        </div>

        {/* Hovered Station Tooltip Floating Card */}
        {hoveredStation && (
          <div
            className="absolute top-4 left-14 z-[1000] max-w-xs bg-slate-900/95 border border-slate-700/80 rounded-lg p-3 shadow-xl backdrop-blur-md pointer-events-none"
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5 mb-2">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs font-bold text-cyan-400">
                  {hoveredStation.code}
                </span>
                <span className="text-xs text-slate-200 font-medium">
                  {hoveredStation.name}
                </span>
              </div>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-mono border"
                style={{
                  color: SEVERITY_COLOR[hoveredStation.status],
                  borderColor: `${SEVERITY_COLOR[hoveredStation.status]}4d`,
                  background: `${SEVERITY_COLOR[hoveredStation.status]}33`,
                }}
              >
                {SEVERITY_LABEL[hoveredStation.status]}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-[11px] text-slate-400">ระดับน้ำปัจจุบัน</p>
                <p className="font-mono font-bold text-slate-100 tabular-nums">
                  {hoveredStation.currentLevelM.toFixed(2)} ม.รทก.
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400">ระดับตลิ่ง</p>
                <p className="font-mono text-slate-300 tabular-nums">
                  {hoveredStation.bankLevelM.toFixed(2)} ม.รทก.
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400">ความจุลำน้ำ</p>
                <p
                  className={`font-mono font-bold tabular-nums ${
                    hoveredStation.capacityPercent > 100
                      ? 'text-red-400'
                      : hoveredStation.capacityPercent > 90
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {hoveredStation.capacityPercent.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400">อัตราการไหล</p>
                <p className="font-mono text-slate-300 tabular-nums">
                  {hoveredStation.flowRateM3s.toLocaleString()} ลบ.ม./วิ
                </p>
              </div>
            </div>

            <p className="mt-2 text-[11px] text-cyan-400 flex items-center gap-1">
              <span>คลิกเพื่อดูภาพตัดขวางลำน้ำ & กราฟ 24 ชม.</span>
              <ChevronRight className="w-3 h-3" />
            </p>
          </div>
        )}

        {/* Hovered Risk Alert Zone Tooltip */}
        {hoveredAlert && !hoveredStation && (
          <div className="absolute top-4 left-14 z-[1000] max-w-xs bg-slate-900/95 border border-red-500/40 rounded-lg p-3 shadow-xl backdrop-blur-md pointer-events-none">
            <div className="flex items-center gap-2 mb-1.5 text-red-400 font-semibold text-xs">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>พื้นที่เตือนภัย: จ.{hoveredAlert.province}</span>
            </div>
            <p className="text-xs text-slate-300 mb-1">
              อำเภอ: {hoveredAlert.district}
            </p>
            <p className="text-xs text-amber-300 font-mono">
              ระดับน้ำท่วมขัง: {hoveredAlert.waterDepthText}
            </p>
            <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
              {hoveredAlert.description}
            </p>
          </div>
        )}

        {/* Map Legend Overlay in bottom-right (above the attribution strip) */}
        <div className="absolute bottom-7 right-3 z-[1000] bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 text-[11px] backdrop-blur-sm shadow-lg max-w-xs">
          <p className="text-slate-400 font-medium mb-1.5 flex items-center gap-1">
            <Info className="w-3 h-3 text-cyan-400" />
            คำอธิบายสัญลักษณ์แผนที่
          </p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-slate-300">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span>วิกฤต (ล้นตลิ่ง)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              <span>เตือนภัย</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
              <span>เฝ้าระวัง</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>ระดับปกติ</span>
            </div>
          </div>
        </div>

        {/* Quick Instructions Bottom-Left */}
        <div className="hidden sm:flex absolute bottom-7 left-3 z-[1000] items-center gap-2 text-[11px] text-slate-400 bg-slate-900/80 px-2.5 py-1.5 rounded border border-slate-800">
          <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>คลิกที่สถานี (จุดสี) เพื่อเปิดแบบจำลองตัดขวางระดับน้ำ</span>
        </div>
      </div>
    </div>
  );
};
