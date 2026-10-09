import React, { useState } from 'react';
import { FloodAlertZone } from '../types/flood';
import { ShieldAlert, AlertTriangle, Users, MapPin, Clock, Car, Navigation, ShieldCheck, ChevronRight } from 'lucide-react';

interface RiskAlertsPanelProps {
  alertZones: FloodAlertZone[];
  onSelectZone: (zone: FloodAlertZone) => void;
  onNavigateToShelters: () => void;
}

export const RiskAlertsPanel: React.FC<RiskAlertsPanelProps> = ({
  alertZones,
  onSelectZone,
  onNavigateToShelters,
}) => {
  const [levelFilter, setLevelFilter] = useState<'all' | 'critical' | 'warning' | 'watch'>('all');

  const filtered = alertZones.filter((z) => {
    if (levelFilter === 'all') return true;
    return z.riskLevel === levelFilter;
  });

  return (
    <div className="space-y-4">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            ประกาศแจ้งเตือนภัยพื้นที่เสี่ยงน้ำท่วม (Official Disaster Early Warnings)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            ข้อมูลการแจ้งเตือนจากศูนย์บัญชาการสถานการณ์น้ำแห่งชาติและกรมป้องกันและบรรเทาสาธารณภัย (ปภ.)
          </p>
        </div>

        {/* Level Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs">
          <button
            onClick={() => setLevelFilter('all')}
            className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap cursor-pointer ${
              levelFilter === 'all'
                ? 'bg-slate-700 text-white font-medium'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            ทั้งหมด ({alertZones.length})
          </button>
          <button
            onClick={() => setLevelFilter('critical')}
            className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap cursor-pointer ${
              levelFilter === 'critical'
                ? 'bg-red-500/20 text-red-400 border border-red-500/40 font-medium'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            🔴 ระดับวิกฤต (อพยพ)
          </button>
          <button
            onClick={() => setLevelFilter('warning')}
            className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap cursor-pointer ${
              levelFilter === 'warning'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 font-medium'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            🟠 ระดับเตือนภัย
          </button>
          <button
            onClick={() => setLevelFilter('watch')}
            className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap cursor-pointer ${
              levelFilter === 'watch'
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 font-medium'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            🟡 ระดับเฝ้าระวัง
          </button>
        </div>
      </div>

      {/* Alert Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((zone) => {
          const isCrit = zone.riskLevel === 'critical';
          const isWarn = zone.riskLevel === 'warning';

          return (
            <div
              key={zone.id}
              className={`p-5 rounded-xl border transition-all ${
                isCrit
                  ? 'bg-red-950/20 border-red-500/30 hover:border-red-500/60'
                  : isWarn
                  ? 'bg-amber-950/20 border-amber-500/30 hover:border-amber-500/60'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Header of Alert Card */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                        isCrit
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : isWarn
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      }`}
                    >
                      {isCrit
                        ? 'ระดับสีแดง: วิกฤตน้ำท่วมฉับพลัน/ล้นตลิ่ง'
                        : isWarn
                        ? 'ระดับสีส้ม: เตือนภัยเตรียมพร้อม'
                        : 'ระดับสีเหลือง: เฝ้าระวังสถานการณ์'}
                    </span>
                    {zone.evacuationRecommended && (
                      <span className="text-[11px] font-bold text-red-300 bg-red-600/30 px-2 py-0.5 rounded border border-red-500/40 animate-pulse">
                        ⚠️ แนะนำอพยพทันที
                      </span>
                    )}
                  </div>

                  <h4 className="text-base font-bold text-white mt-1.5 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-cyan-400" />
                    <span>จ.{zone.province}</span>
                    <span className="text-xs font-normal text-slate-400">
                      ({zone.basin})
                    </span>
                  </h4>
                </div>
              </div>

              {/* Districts & Subdistricts Affected */}
              <div className="mb-3 space-y-1 text-xs">
                <p className="text-slate-300">
                  <span className="text-slate-400">อำเภอเสี่ยงภัย: </span>
                  <span className="font-semibold text-slate-100">{zone.district}</span>
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {zone.subdistricts.map((sub, i) => (
                    <span
                      key={i}
                      className="text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60"
                    >
                      {sub}
                    </span>
                  ))}
                </div>
              </div>

              {/* Description & Situation */}
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 mb-3">
                {zone.description}
              </p>

              {/* Inundation Stats & Road Condition */}
              <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[11px] text-slate-400">คาดการณ์ระดับน้ำท่วมขัง</span>
                  <p className="font-mono font-bold text-amber-300 text-sm mt-0.5">
                    {zone.waterDepthText}
                  </p>
                </div>

                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[11px] text-slate-400">การสัญจร / ถนน</span>
                  <p
                    className={`font-semibold text-xs mt-0.5 flex items-center gap-1 ${
                      zone.roadPassable ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    <Car className="w-3.5 h-3.5" />
                    <span>{zone.roadPassable ? 'สัญจรได้ระมัดระวัง' : 'รถเล็กห้ามผ่านเด็ดขาด'}</span>
                  </p>
                </div>

                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Users className="w-3 h-3 text-slate-500" />
                    ครัวเรือนในพื้นที่
                  </span>
                  <p className="font-mono text-slate-200 mt-0.5">
                    ~{zone.affectedHouseholds.toLocaleString()} หลังคาเรือน
                  </p>
                </div>

                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    มีผลบังคับใช้
                  </span>
                  <p className="text-slate-200 mt-0.5">
                    {zone.validUntil}
                  </p>
                </div>
              </div>

              {/* Card Actions */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-xs">
                <button
                  onClick={() => onSelectZone(zone)}
                  className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>ดูพิกัดบนแผนที่</span>
                </button>

                {zone.evacuationRecommended && (
                  <button
                    onClick={onNavigateToShelters}
                    className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>ค้นหาศูนย์พักพิงใกล้เคียง</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
