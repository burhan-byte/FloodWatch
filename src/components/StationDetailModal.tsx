import React from 'react';
import { GaugingStation } from '../types/flood';
import { X, TrendingUp, TrendingDown, Minus, AlertTriangle, ShieldCheck, Waves, Clock, MapPin, Gauge } from 'lucide-react';

interface StationDetailModalProps {
  station: GaugingStation | null;
  onClose: () => void;
}

export const StationDetailModal: React.FC<StationDetailModalProps> = ({ station, onClose }) => {
  if (!station) return null;

  const isOverflow = station.currentLevelM >= station.bankLevelM;
  const diffM = Math.abs(station.currentLevelM - station.bankLevelM).toFixed(2);
  const diffText = isOverflow
    ? `ล้นตลิ่งแล้ว +${diffM} เมตร`
    : `ต่ำกว่าตลิ่ง -${diffM} เมตร`;

  // River cross-section geometry calculation
  // Let bank be at 80% height, bed at 10% height
  const waterHeightPct = Math.min(
    100,
    Math.max(15, (station.capacityPercent / 120) * 80)
  );
  const bankLinePct = 75; // 75% height from bottom represents the river bank
  const warningLinePct = (station.warningLevelM / station.bankLevelM) * bankLinePct;

  // Hydrograph max and min
  const levels = station.history24h.map((h) => h.level);
  const minL = Math.min(...levels, station.bankLevelM * 0.8);
  const maxL = Math.max(...levels, station.bankLevelM * 1.1);
  const range = maxL - minL || 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-bold text-sm ${
                station.status === 'critical'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                  : station.status === 'warning'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              }`}
            >
              {station.code}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {station.name}
                </h3>
                <span className="text-xs text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded">
                  {station.riverName}
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3 h-3 text-slate-500" />
                <span>จ.{station.province}</span>
                <span>·</span>
                <span>{station.basin}</span>
                <span>·</span>
                <Clock className="w-3 h-3 text-slate-500 ml-1" />
                <span>อัปเดต: {station.lastUpdated}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-sm">
          {/* Key Metric Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400">ระดับน้ำปัจจุบัน</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl sm:text-2xl font-bold font-mono text-cyan-300 tabular-nums">
                  {station.currentLevelM.toFixed(2)}
                </span>
                <span className="text-xs text-slate-500">ม.รทก.</span>
              </div>
              <div className="mt-1 flex items-center gap-1 text-[11px]">
                {station.trend === 'rising' ? (
                  <span className="text-red-400 flex items-center">
                    <TrendingUp className="w-3 h-3 mr-0.5" /> มีแนวโน้มเพิ่มขึ้น
                  </span>
                ) : station.trend === 'falling' ? (
                  <span className="text-emerald-400 flex items-center">
                    <TrendingDown className="w-3 h-3 mr-0.5" /> มีแนวโน้มลดลง
                  </span>
                ) : (
                  <span className="text-slate-400 flex items-center">
                    <Minus className="w-3 h-3 mr-0.5" /> ระดับน้ำทรงตัว
                  </span>
                )}
              </div>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400">ระดับตลิ่ง</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl sm:text-2xl font-bold font-mono text-slate-200 tabular-nums">
                  {station.bankLevelM.toFixed(2)}
                </span>
                <span className="text-xs text-slate-500">ม.รทก.</span>
              </div>
              <p
                className={`text-[11px] font-mono mt-1 ${
                  isOverflow ? 'text-red-400 font-semibold' : 'text-slate-400'
                }`}
              >
                {diffText}
              </p>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400">อัตราการไหล</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl sm:text-2xl font-bold font-mono text-slate-200 tabular-nums">
                  {station.flowRateM3s.toLocaleString()}
                </span>
                <span className="text-xs text-slate-500">ลบ.ม./วิ</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                ความจุลำน้ำ: {station.capacityPercent.toFixed(1)}%
              </p>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400">คาดการณ์ 6 ชม. ข้างหน้า</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span
                  className={`text-xl sm:text-2xl font-bold font-mono tabular-nums ${
                    station.forecast6h > station.bankLevelM
                      ? 'text-red-400'
                      : 'text-amber-300'
                  }`}
                >
                  {station.forecast6h.toFixed(2)}
                </span>
                <span className="text-xs text-slate-500">ม.รทก.</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {station.forecast6h > station.currentLevelM ? 'คาดว่าจะขึ้นอีก' : 'คาดว่าจะลดลง'}
              </p>
            </div>
          </div>

          {/* Interactive Cross-Section River Diagram (แบบจำลองตัดขวางลำน้ำ) */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-cyan-400" />
                แบบจำลองภาพตัดขวางลำน้ำ (River Cross-Section Telemetry)
              </h4>
              <span className="text-xs font-mono text-slate-400">
                สถานะ: {isOverflow ? '⚠️ น้ำล้นข้ามตลิ่ง' : 'ปกติ/ปลอดภัย'}
              </span>
            </div>

            <div className="relative w-full h-44 bg-[#0a1220] rounded-lg border border-slate-800 overflow-hidden flex flex-col justify-end">
              {/* Levee / Bank Left & Right Ground Polygons */}
              <div className="absolute inset-0 pointer-events-none">
                <svg viewBox="0 0 400 160" className="w-full h-full preserve-3d" preserveAspectRatio="none">
                  {/* Left River Bank (Slope into water) */}
                  <polygon
                    points="0,40 70,40 110,140 0,160"
                    fill="#1e293b"
                    stroke="#334155"
                    strokeWidth="1.5"
                  />
                  {/* Right River Bank */}
                  <polygon
                    points="330,40 400,40 400,160 290,140"
                    fill="#1e293b"
                    stroke="#334155"
                    strokeWidth="1.5"
                  />
                  {/* River Bed Bottom */}
                  <polygon
                    points="110,140 290,140 290,160 110,160"
                    fill="#0f172a"
                  />

                  {/* Red Bank Threshold Line across the river */}
                  <line
                    x1="60"
                    y1="40"
                    x2="340"
                    y2="40"
                    stroke="#ef4444"
                    strokeWidth="1.5"
                    strokeDasharray="4, 3"
                  />
                  <text x="175" y="35" fill="#f87171" fontSize="10" fontFamily="sans-serif">
                    ระดับตลิ่ง ({station.bankLevelM} ม.รทก.)
                  </text>

                  {/* Warning Threshold Line */}
                  <line
                    x1="80"
                    y1="65"
                    x2="320"
                    y2="65"
                    stroke="#f59e0b"
                    strokeWidth="1"
                    strokeDasharray="3, 3"
                  />
                  <text x="170" y="60" fill="#fbbf24" fontSize="9" fontFamily="sans-serif">
                    ระดับเตือนภัย ({station.warningLevelM} ม.รทก.)
                  </text>
                </svg>
              </div>

              {/* Dynamic Water Volume */}
              <div
                className="relative w-full transition-all duration-1000 ease-out bg-gradient-to-t from-cyan-900/90 via-cyan-600/70 to-cyan-400/80 border-t-2 border-cyan-300"
                style={{ height: `${Math.min(95, Math.max(20, (waterHeightPct)))}%` }}
              >
                {/* Water surface wave highlights */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-cyan-200/60 animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center bg-slate-900/80 px-3 py-1 rounded border border-cyan-500/40 backdrop-blur-sm">
                    <span className="text-xs font-mono font-bold text-white tabular-nums">
                      ระดับน้ำปัจจุบัน {station.currentLevelM.toFixed(2)} ม.รทก.
                    </span>
                    <span className="text-[10px] text-cyan-200 block">
                      ความจุลำน้ำ: {station.capacityPercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 24-Hour Hydrograph (กราฟย้อนหลัง 24 ชม.) */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <h4 className="text-xs font-semibold text-slate-200 mb-3 flex items-center gap-1.5">
              <Waves className="w-4 h-4 text-cyan-400" />
              กราฟระดับน้ำย้อนหลัง 24 ชม. (Hydrograph)
            </h4>

            <div className="h-44 w-full">
              <svg viewBox="0 0 500 160" className="w-full h-full overflow-visible">
                {/* Horizontal reference grid lines */}
                <line x1="40" y1="20" x2="480" y2="20" stroke="#334155" strokeDasharray="3,3" />
                <line x1="40" y1="80" x2="480" y2="80" stroke="#1e293b" />
                <line x1="40" y1="140" x2="480" y2="140" stroke="#1e293b" />

                {/* Bank line in red */}
                {(() => {
                  const bankY = 140 - ((station.bankLevelM - minL) / range) * 120;
                  return (
                    <line
                      x1="40"
                      y1={bankY}
                      x2="480"
                      y2={bankY}
                      stroke="#ef4444"
                      strokeWidth="1.2"
                      strokeDasharray="4, 4"
                    />
                  );
                })()}

                {/* Hydrograph points and path */}
                {(() => {
                  const points = station.history24h.map((h, i) => {
                    const x = 50 + (i / (station.history24h.length - 1)) * 420;
                    const y = 140 - ((h.level - minL) / range) * 120;
                    return { x, y, ...h };
                  });

                  const pathD = points.reduce((acc, pt, i) => {
                    return i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
                  }, '');

                  const areaD = `${pathD} L ${points[points.length - 1].x},140 L ${points[0].x},140 Z`;

                  return (
                    <>
                      {/* Gradient Fill under line */}
                      <path d={areaD} fill="rgba(6, 182, 212, 0.15)" />
                      {/* Line */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {/* Nodes */}
                      {points.map((pt, i) => (
                        <g key={i}>
                          <circle cx={pt.x} cy={pt.y} r="3.5" fill="#0891b2" stroke="#ecfeff" strokeWidth="1.5" />
                          <text
                            x={pt.x}
                            y={pt.y - 7}
                            textAnchor="middle"
                            fill="#cbd5e1"
                            fontSize="9"
                            fontFamily="monospace"
                          >
                            {pt.level.toFixed(2)}
                          </text>
                          <text
                            x={pt.x}
                            y="155"
                            textAnchor="middle"
                            fill="#64748b"
                            fontSize="9"
                            fontFamily="monospace"
                          >
                            {pt.time}
                          </text>
                        </g>
                      ))}
                    </>
                  );
                })()}
              </svg>
            </div>
          </div>

          {/* Actionable Advice & Warning Notification */}
          <div
            className={`p-4 rounded-xl border ${
              isOverflow
                ? 'bg-red-950/40 border-red-500/50 text-red-200'
                : 'bg-slate-950/60 border-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <h5 className="font-semibold text-white mb-1">
                  คำแนะนำสำหรับพื้นที่ท้ายน้ำสถานี {station.code} ({station.province})
                </h5>
                <p className="text-xs leading-relaxed text-slate-300">
                  {isOverflow
                    ? 'ระดับน้ำเอ่อล้นตลิ่ง ขอให้ประชาชนในพื้นที่ลุ่มต่ำนอกแนวคันกั้นน้ำขนย้ายทรัพย์สินและอุปกรณ์ไฟฟ้าขึ้นที่สูง ย้ายรถยนต์ไปจอดบนพื้นที่ดอน และติดตามประกาศจาก ปภ. อย่างใกล้ชิด'
                    : 'ระดับน้ำอยู่ในเกณฑ์เฝ้าระวัง ให้ตรวจสอบคันกั้นน้ำและเตรียมกระสอบทรายสำรอง ปิดกั้นท่อระบายน้ำเพื่อป้องกันน้ำหนุนไหลย้อนกลับ'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
