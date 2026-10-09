import React from 'react';
import { PhoneCall, Radio, BellRing, Sparkles, AlertCircle } from 'lucide-react';

interface EmergencyTickerProps {
  isSimulatingLive: boolean;
  setIsSimulatingLive: (val: boolean | ((prev: boolean) => boolean)) => void;
  lastTickTime: string;
  onOpenNotifyModal: () => void;
  criticalCount: number;
  warningCount: number;
}

export const EmergencyTicker: React.FC<EmergencyTickerProps> = ({
  isSimulatingLive,
  setIsSimulatingLive,
  lastTickTime,
  onOpenNotifyModal,
  criticalCount,
  warningCount,
}) => {
  return (
    <div className="bg-slate-900/90 border-b border-slate-800 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Emergency Alert Highlights */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-red-400 font-semibold shrink-0">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>สถานะเตือนภัย:</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="text-red-400 font-medium">
                วิกฤตสีแดง {criticalCount} พื้นที่
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-amber-400 font-medium">
                เตือนภัยสีส้ม {warningCount} พื้นที่
              </span>
              <span className="text-slate-600 hidden md:inline">·</span>
              <span className="text-slate-400 hidden md:inline">
                ลุ่มน้ำเจ้าพระยา, ยม, มูล มีอัตราการไหลเกินความจุลำน้ำ
              </span>
            </div>
          </div>

          {/* Quick Hotlines & Telemetry Stream Control */}
          <div className="flex items-center gap-4 shrink-0">
            {/* Hotlines */}
            <div className="hidden sm:flex items-center gap-2 text-slate-400">
              <PhoneCall className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-500">สายด่วน:</span>
              <a
                href="tel:1784"
                className="text-slate-300 hover:text-white font-mono font-medium underline underline-offset-2"
                title="สายด่วนนิรภัย กรมป้องกันและบรรเทาสาธารณภัย"
              >
                1784 ปภ.
              </a>
              <span className="text-slate-700">|</span>
              <a
                href="tel:1460"
                className="text-slate-300 hover:text-white font-mono font-medium underline underline-offset-2"
                title="ศูนย์ประมวลวิเคราะห์สถานการณ์น้ำ กรมชลประทาน"
              >
                1460 ชลประทาน
              </a>
            </div>

            {/* Test Mobile Notification */}
            <button
              onClick={onOpenNotifyModal}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              <BellRing className="w-3 h-3 text-cyan-400" />
              <span>ตั้งค่าเตือน SMS/LINE</span>
            </button>

            {/* Live Sensor Stream Toggle */}
            <button
              onClick={() => setIsSimulatingLive((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border transition-all cursor-pointer ${
                isSimulatingLive
                  ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
              title="สลับโหมดจำลองสตรีมข้อมูลโทรมาตรแบบเรียลไทม์"
            >
              <Radio
                className={`w-3 h-3 ${
                  isSimulatingLive ? 'text-cyan-400 animate-pulse' : 'text-slate-500'
                }`}
              />
              <span className="font-mono tabular-nums">
                {isSimulatingLive ? `สด: ${lastTickTime}` : 'หยุดสตรีมสด'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
