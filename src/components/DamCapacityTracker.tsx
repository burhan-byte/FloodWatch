import React from 'react';
import { DamStatus } from '../types/flood';
import { Database, ArrowDownRight, ArrowUpRight, AlertTriangle, ShieldCheck, Info } from 'lucide-react';

interface DamCapacityTrackerProps {
  dams: DamStatus[];
}

export const DamCapacityTracker: React.FC<DamCapacityTrackerProps> = ({ dams }) => {
  return (
    <div className="space-y-4">
      {/* Overview Banner */}
      <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-400" />
              สถานการณ์ปริมาณน้ำในอ่างเก็บน้ำและเขื่อนหลัก (Major Dams & Reservoirs)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              ติดตามปริมาณน้ำกักเก็บ น้ำไหลเข้า (Inflow) และอัตราการระบายน้ำ (Outflow) เพื่อประเมินผลกระทบท้ายน้ำ
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs bg-slate-950/60 px-3 py-2 rounded-lg border border-slate-800">
            <div>
              <span className="text-slate-400">เขื่อนเจ้าพระยาระบาย:</span>
              <span className="ml-1.5 font-mono font-bold text-amber-300">2,190 ลบ.ม./วินาที</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {dams.map((dam) => {
          const isCrit = dam.percentCapacity >= 90;
          const isWarn = dam.percentCapacity >= 80 && dam.percentCapacity < 90;

          return (
            <div
              key={dam.id}
              className={`p-4 sm:p-5 rounded-xl border bg-slate-900 transition-all ${
                isCrit
                  ? 'border-red-500/40 hover:border-red-500/70'
                  : isWarn
                  ? 'border-amber-500/40 hover:border-amber-500/70'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <h4 className="text-base font-bold text-white">{dam.name}</h4>
                  <p className="text-xs text-slate-400">
                    จ.{dam.province} · {dam.basin}
                  </p>
                </div>

                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded font-bold ${
                    isCrit
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : isWarn
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {dam.percentCapacity}%
                </span>
              </div>

              {/* Reservoir Capacity Bar */}
              <div className="space-y-1 mb-4">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">ปริมาตรน้ำกักเก็บ</span>
                  <span className="font-mono text-slate-200">
                    {dam.currentStorageMcm.toLocaleString()} / {dam.maxCapacityMcm.toLocaleString()} ล้าน ลบ.ม.
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-700 ${
                      isCrit
                        ? 'bg-red-500'
                        : isWarn
                        ? 'bg-amber-500'
                        : 'bg-indigo-500'
                    }`}
                    style={{ width: `${Math.min(100, dam.percentCapacity)}%` }}
                  />
                </div>
              </div>

              {/* Inflow vs Outflow */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                <div>
                  <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                    <ArrowDownRight className="w-3.5 h-3.5 text-cyan-400" />
                    น้ำไหลเข้าอ่าง (วัน)
                  </span>
                  <p className="font-mono font-bold text-slate-100 mt-1 tabular-nums">
                    +{dam.inflowMcmDay.toFixed(1)} <span className="text-[10px] text-slate-500">ล้าน ลบ.ม.</span>
                  </p>
                </div>

                <div>
                  <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                    <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
                    น้ำระบายออก (วัน)
                  </span>
                  <p className="font-mono font-bold text-slate-100 mt-1 tabular-nums">
                    -{dam.outflowMcmDay.toFixed(1)} <span className="text-[10px] text-slate-500">ล้าน ลบ.ม.</span>
                  </p>
                </div>
              </div>

              {/* Warning note if critical */}
              {isCrit && (
                <div className="mt-3 text-[11px] text-red-300 flex items-center gap-1.5 bg-red-950/30 p-2 rounded border border-red-500/20">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <span>ปริมาณน้ำเกิน 90% เตรียมเพิ่มการระบายน้ำ เฝ้าระวังพื้นที่ท้ายเขื่อน</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
