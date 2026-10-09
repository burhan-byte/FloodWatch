import React from 'react';
import { Waves, Bell, LifeBuoy, AlertTriangle } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenReportModal: () => void;
  onOpenGuideModal: () => void;
  criticalAlertsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenReportModal,
  onOpenGuideModal,
  criticalAlertsCount,
}) => {
  const navItems = [
    { id: 'overview', label: 'แผนที่สถานการณ์ & ภาพรวม' },
    { id: 'stations', label: 'ระดับน้ำสถานีโทรมาตร' },
    { id: 'alerts', label: 'ประกาศเตือนภัยพื้นที่เสี่ยง' },
    { id: 'dams', label: 'ความจุเขื่อนหลัก' },
    { id: 'shelters', label: 'ศูนย์พักพิง & รายงานภาคสนาม' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Waves className="w-5 h-5" />
            </div>
            <a
              href="#overview"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('overview');
              }}
              className="text-lg font-bold tracking-tight text-white whitespace-nowrap"
            >
              ThaiFloodWatch
            </a>
          </div>

          {/* Zone 2: 4-5 concise single-line nav links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-300">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'text-cyan-400 font-semibold'
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  {item.label}
                  {item.id === 'alerts' && criticalAlertsCount > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.2 text-[11px] font-mono bg-red-500/20 text-red-400 border border-red-500/30 rounded">
                      {criticalAlertsCount}
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onOpenGuideModal}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-3 py-2 rounded-lg border border-slate-700 hover:border-slate-600 bg-slate-900 transition-colors whitespace-nowrap cursor-pointer"
              title="คู่มือเตรียมรับมือน้ำท่วม"
            >
              <LifeBuoy className="w-3.5 h-3.5 text-amber-400" />
              <span>คู่มือฉุกเฉิน 72 ชม.</span>
            </button>
            <button
              onClick={onOpenReportModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 active:bg-red-700 rounded-lg shadow-sm transition-all whitespace-nowrap cursor-pointer"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>แจ้งเหตุ / ขอความช่วยเหลือ SOS</span>
            </button>
          </div>
        </div>

        {/* Mobile secondary navigation */}
        <div className="flex lg:hidden overflow-x-auto py-2 gap-2 border-t border-slate-800/80 scrollbar-none text-xs">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`px-3 py-1.5 rounded whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                activeTab === item.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-medium'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-900/50'
              }`}
            >
              {item.label}
              {item.id === 'alerts' && criticalAlertsCount > 0 && (
                <span className="ml-1 text-red-400 font-mono">({criticalAlertsCount})</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
