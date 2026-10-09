import React, { useState } from 'react';
import { GaugingStation, FloodAlertZone, DamStatus, EvacuationShelter } from '../types/flood';
import { Layers, CloudRain, ShieldAlert, MapPin, Eye, Compass, Info, ChevronRight, Activity } from 'lucide-react';

interface GisFloodMapProps {
  stations: GaugingStation[];
  alertZones: FloodAlertZone[];
  dams: DamStatus[];
  shelters: EvacuationShelter[];
  onSelectStation: (st: GaugingStation) => void;
  onSelectAlertZone: (zone: FloodAlertZone) => void;
}

type RegionPreset = 'all' | 'central' | 'north' | 'northeast' | 'south';

export const GisFloodMap: React.FC<GisFloodMapProps> = ({
  stations,
  alertZones,
  dams,
  shelters,
  onSelectStation,
  onSelectAlertZone,
}) => {
  const [region, setRegion] = useState<RegionPreset>('all');
  const [showStations, setShowStations] = useState(true);
  const [showAlerts, setShowAlerts] = useState(true);
  const [showDams, setShowDams] = useState(true);
  const [showRadar, setShowRadar] = useState(true);
  const [showShelters, setShowShelters] = useState(false);
  const [hoveredStation, setHoveredStation] = useState<GaugingStation | null>(null);
  const [hoveredAlert, setHoveredAlert] = useState<FloodAlertZone | null>(null);

  // Region ViewBox mappings (minX minY width height in a 100x100 coord space)
  const viewBoxes: Record<RegionPreset, string> = {
    all: '10 5 85 92',
    central: '35 32 30 35',
    north: '25 10 35 32',
    northeast: '50 25 45 40',
    south: '30 65 30 32',
  };

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
      <div className="relative w-full h-[540px] sm:h-[620px] bg-[#070d18] overflow-hidden select-none">
        {/* Subtle coordinate grid lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#132238_1px,transparent_1px),linear-gradient(to_bottom,#132238_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

        <svg
          viewBox={viewBoxes[region]}
          className="w-full h-full transition-all duration-700 ease-out"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Radar Sweep Gradient */}
            <radialGradient id="radarScan" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
            </radialGradient>

            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Stylized Thailand Landmass Outline Path */}
          <path
            d="
              M 30,12 
              C 35,10 45,8 55,14
              C 60,18 64,22 65,26
              C 72,25 82,28 88,32
              C 92,37 94,45 92,52
              C 89,57 82,60 76,57
              C 72,55 66,54 62,56
              C 58,58 54,60 52,65
              C 50,70 48,78 45,84
              C 43,89 48,93 47,96
              C 44,97 42,94 40,88
              C 38,80 37,72 38,66
              C 39,60 38,58 35,55
              C 30,52 28,48 26,42
              C 24,35 25,25 28,18
              Z
            "
            fill="#0f1f38"
            stroke="#1e3a5f"
            strokeWidth="0.8"
            className="transition-all duration-300"
          />

          {/* Major River Basins (Glow waterways) */}
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            {/* Ping River */}
            <path
              d="M 33,14 Q 35,22 36,28 T 46,38"
              stroke="#06b6d4"
              strokeWidth="1.2"
              strokeOpacity="0.85"
            />
            {/* Wang River */}
            <path
              d="M 40,16 Q 41,23 42,28 T 46,38"
              stroke="#06b6d4"
              strokeWidth="0.9"
              strokeOpacity="0.75"
            />
            {/* Yom River */}
            <path
              d="M 46,16 Q 44,24 45,30 T 47,38"
              stroke="#06b6d4"
              strokeWidth="1.1"
              strokeOpacity="0.85"
            />
            {/* Nan River */}
            <path
              d="M 52,15 Q 50,23 49,30 T 48,38"
              stroke="#06b6d4"
              strokeWidth="1.2"
              strokeOpacity="0.85"
            />

            {/* Chao Phraya Main Stem (Nakhon Sawan -> Gulf) */}
            <path
              d="M 48,38 Q 47,44 48,50 T 49,58"
              stroke="#38bdf8"
              strokeWidth="2.2"
              strokeOpacity="0.95"
              filter="url(#glow)"
            />

            {/* Pa Sak River */}
            <path
              d="M 56,28 Q 53,38 51,47 T 49,51"
              stroke="#06b6d4"
              strokeWidth="1.1"
              strokeOpacity="0.8"
            />

            {/* Chi River (Northeast) */}
            <path
              d="M 58,35 Q 66,38 72,43 T 79,49"
              stroke="#0ea5e9"
              strokeWidth="1.4"
              strokeOpacity="0.85"
            />

            {/* Mun River (Northeast) */}
            <path
              d="M 56,48 Q 66,49 74,49 T 88,48"
              stroke="#0ea5e9"
              strokeWidth="1.6"
              strokeOpacity="0.9"
            />

            {/* Tapi River (South) */}
            <path
              d="M 43,72 Q 41,78 40,82"
              stroke="#06b6d4"
              strokeWidth="1.2"
              strokeOpacity="0.85"
            />

            {/* Khlong U-Tapao (Hat Yai) */}
            <path
              d="M 46,82 Q 47,85 47,88"
              stroke="#06b6d4"
              strokeWidth="1.0"
              strokeOpacity="0.8"
            />
          </g>

          {/* Rain Radar Sweep Simulation Layer */}
          {showRadar && (
            <g className="pointer-events-none">
              {/* Rain cloud patch over Central/Chao Phraya */}
              <ellipse
                cx="48"
                cy="46"
                rx="14"
                ry="10"
                fill="url(#radarScan)"
                className="animate-pulse"
                style={{ animationDuration: '4s' }}
              />
              {/* Rain cloud patch over Ubon / Mun Basin */}
              <ellipse
                cx="78"
                cy="48"
                rx="12"
                ry="8"
                fill="url(#radarScan)"
                className="animate-pulse"
                style={{ animationDuration: '3.5s' }}
              />
              {/* Rain cloud patch over South / Surat */}
              <ellipse
                cx="42"
                cy="76"
                rx="8"
                ry="6"
                fill="url(#radarScan)"
                className="animate-pulse"
                style={{ animationDuration: '4.5s' }}
              />
            </g>
          )}

          {/* Flood Inundation Risk Zones Polygons / Circles */}
          {showAlerts &&
            alertZones.map((zone) => {
              const isRed = zone.riskLevel === 'critical';
              const isOrange = zone.riskLevel === 'warning';
              const fillColor = isRed
                ? '#ef4444'
                : isOrange
                ? '#f97316'
                : '#eab308';
              const radius = isRed ? 3.8 : 3.0;

              return (
                <g
                  key={zone.id}
                  className="cursor-pointer group"
                  onClick={() => onSelectAlertZone(zone)}
                  onMouseEnter={() => setHoveredAlert(zone)}
                  onMouseLeave={() => setHoveredAlert(null)}
                >
                  {/* Outer Pulsing Shockwave for critical zones */}
                  {isRed && (
                    <circle
                      cx={zone.x}
                      cy={zone.y}
                      r={radius * 1.8}
                      fill="none"
                      stroke={fillColor}
                      strokeWidth="0.5"
                      strokeOpacity="0.6"
                      className="animate-ping"
                      style={{ transformOrigin: `${zone.x}px ${zone.y}px`, animationDuration: '2.5s' }}
                    />
                  )}
                  {/* Danger Zone Radius Area */}
                  <circle
                    cx={zone.x}
                    cy={zone.y}
                    r={radius}
                    fill={fillColor}
                    fillOpacity={isRed ? 0.35 : 0.25}
                    stroke={fillColor}
                    strokeWidth="0.7"
                    strokeDasharray={isRed ? 'none' : '1, 1'}
                  />
                  {/* Danger Core Marker */}
                  <circle
                    cx={zone.x}
                    cy={zone.y}
                    r="1.2"
                    fill={fillColor}
                  />
                </g>
              );
            })}

          {/* Major Dams */}
          {showDams &&
            dams.map((dam) => {
              const isCrit = dam.status === 'critical';
              return (
                <g key={dam.id} className="cursor-pointer">
                  <rect
                    x={dam.x - 1.2}
                    y={dam.y - 1.2}
                    width="2.4"
                    height="2.4"
                    fill="#6366f1"
                    stroke="#a5b4fc"
                    strokeWidth="0.4"
                    rx="0.5"
                  />
                  <text
                    x={dam.x + 2}
                    y={dam.y + 0.8}
                    fill="#cbd5e1"
                    fontSize="1.8"
                    fontFamily="monospace"
                    className="select-none pointer-events-none hidden sm:block"
                  >
                    {dam.name} ({dam.percentCapacity}%)
                  </text>
                </g>
              );
            })}

          {/* Shelters */}
          {showShelters &&
            shelters.map((sh) => (
              <g key={sh.id} className="cursor-pointer">
                <circle
                  cx={sh.lat > 16 ? 43 : 48}
                  cy={sh.lat > 16 ? 28 : 50}
                  r="1.2"
                  fill="#f59e0b"
                  stroke="#ffffff"
                  strokeWidth="0.4"
                />
              </g>
            ))}

          {/* Gauging Stations */}
          {showStations &&
            stations.map((st) => {
              const isCrit = st.status === 'critical';
              const isWarn = st.status === 'warning';
              const isWatch = st.status === 'watch';
              const markerColor = isCrit
                ? '#ef4444'
                : isWarn
                ? '#f97316'
                : isWatch
                ? '#eab308'
                : '#10b981';

              return (
                <g
                  key={st.id}
                  className="cursor-pointer transition-transform hover:scale-125"
                  onClick={() => onSelectStation(st)}
                  onMouseEnter={() => setHoveredStation(st)}
                  onMouseLeave={() => setHoveredStation(null)}
                >
                  {/* Subtle beacon ping for overflowing stations */}
                  {isCrit && (
                    <circle
                      cx={st.x}
                      cy={st.y}
                      r="3.5"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="0.5"
                      strokeOpacity="0.5"
                      className="animate-ping"
                      style={{ transformOrigin: `${st.x}px ${st.y}px`, animationDuration: '3s' }}
                    />
                  )}
                  {/* Telemetry Sensor Node */}
                  <circle
                    cx={st.x}
                    cy={st.y}
                    r="1.8"
                    fill="#0f172a"
                    stroke={markerColor}
                    strokeWidth="0.9"
                  />
                  <circle
                    cx={st.x}
                    cy={st.y}
                    r="0.9"
                    fill={markerColor}
                  />
                  {/* Label on Map */}
                  <text
                    x={st.x + 2.4}
                    y={st.y + 0.8}
                    fill="#f1f5f9"
                    fontSize="2.1"
                    fontWeight="600"
                    fontFamily="monospace"
                    className="select-none pointer-events-none drop-shadow"
                  >
                    {st.code}
                  </text>
                </g>
              );
            })}
        </svg>

        {/* Hovered Station Tooltip Floating Card */}
        {hoveredStation && (
          <div
            className="absolute top-4 left-4 z-20 max-w-xs bg-slate-900/95 border border-slate-700/80 rounded-lg p-3 shadow-xl backdrop-blur-md pointer-events-none animate-in fade-in duration-150"
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
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                  hoveredStation.status === 'critical'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : hoveredStation.status === 'warning'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {hoveredStation.status === 'critical'
                  ? 'ล้นตลิ่ง'
                  : hoveredStation.status === 'warning'
                  ? 'เตือนภัย'
                  : 'เฝ้าระวัง'}
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
          <div className="absolute top-4 left-4 z-20 max-w-xs bg-slate-900/95 border border-red-500/40 rounded-lg p-3 shadow-xl backdrop-blur-md pointer-events-none animate-in fade-in duration-150">
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

        {/* Map Legend Overlay in bottom-right */}
        <div className="absolute bottom-3 right-3 z-10 bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 text-[11px] backdrop-blur-sm shadow-lg max-w-xs">
          <p className="text-slate-400 font-medium mb-1.5 flex items-center gap-1">
            <Info className="w-3 h-3 text-cyan-400" />
            คำอธิบายสัญลักษณ์แผนที่
          </p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-slate-300">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span>วิกฤต (&gt;100% ล้นตลิ่ง)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>เตือนภัย (90-100%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
              <span>เฝ้าระวัง (75-90%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>ระดับปกติ (&lt;75%)</span>
            </div>
          </div>
        </div>

        {/* Quick Instructions Bottom-Left */}
        <div className="hidden sm:flex absolute bottom-3 left-3 z-10 items-center gap-2 text-[11px] text-slate-400 bg-slate-900/80 px-2.5 py-1.5 rounded border border-slate-800">
          <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>คลิกที่สถานี (จุดสี) เพื่อเปิดแบบจำลองตัดขวางระดับน้ำ</span>
        </div>
      </div>
    </div>
  );
};
