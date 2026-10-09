/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  INITIAL_STATIONS,
  INITIAL_ALERT_ZONES,
  INITIAL_DAMS,
  INITIAL_SHELTERS,
  INITIAL_CITIZEN_REPORTS,
} from './data/mockFloodData';
import { GaugingStation, FloodAlertZone, CitizenReport } from './types/flood';
import { Header } from './components/Header';
import { EmergencyTicker } from './components/EmergencyTicker';
import { GisFloodMap } from './components/GisFloodMap';
import { StationDetailModal } from './components/StationDetailModal';
import { TelemetryStationsTable } from './components/TelemetryStationsTable';
import { RiskAlertsPanel } from './components/RiskAlertsPanel';
import { DamCapacityTracker } from './components/DamCapacityTracker';
import { ShelterAndHelpPanel } from './components/ShelterAndHelpPanel';
import { ReportFloodModal } from './components/ReportFloodModal';
import { EmergencyGuideModal } from './components/EmergencyGuideModal';
import { NotificationSettingsModal } from './components/NotificationSettingsModal';
import {
  Activity,
  ShieldAlert,
  Waves,
  Database,
  Home,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Info,
  Radio,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [stations, setStations] = useState<GaugingStation[]>(INITIAL_STATIONS);
  const [alertZones, setAlertZones] = useState<FloodAlertZone[]>(INITIAL_ALERT_ZONES);
  const [dams, setDams] = useState(INITIAL_DAMS);
  const [shelters, setShelters] = useState(INITIAL_SHELTERS);
  const [citizenReports, setCitizenReports] = useState<CitizenReport[]>(INITIAL_CITIZEN_REPORTS);

  const [selectedStation, setSelectedStation] = useState<GaugingStation | null>(null);
  const [selectedAlertZone, setSelectedAlertZone] = useState<FloodAlertZone | null>(null);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);

  const [isSimulatingLive, setIsSimulatingLive] = useState(true);
  const [lastTickTime, setLastTickTime] = useState('20:53:15');

  // Real-time sensor stream simulation loop
  useEffect(() => {
    if (!isSimulatingLive) return;

    const interval = setInterval(() => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('th-TH', { hour12: false });
      setLastTickTime(timeStr);

      setStations((prev) =>
        prev.map((st) => {
          // Slight micro-jitter for telemetry simulation
          const delta = (Math.random() - 0.48) * 0.02;
          const newLevel = Math.max(1, Number((st.currentLevelM + delta).toFixed(2)));
          const flowDelta = Math.floor((Math.random() - 0.48) * 8);
          const newFlow = Math.max(50, st.flowRateM3s + flowDelta);
          const newCap = Number(((newLevel / st.bankLevelM) * 100).toFixed(1));

          let newStatus = st.status;
          if (newLevel >= st.bankLevelM) {
            newStatus = 'critical';
          } else if (newLevel >= st.warningLevelM) {
            newStatus = 'warning';
          }

          return {
            ...st,
            currentLevelM: newLevel,
            flowRateM3s: newFlow,
            capacityPercent: newCap,
            waterDepthDiffM: Number((newLevel - st.bankLevelM).toFixed(2)),
            status: newStatus,
            lastUpdated: 'เมื่อสักครู่',
          };
        })
      );
    }, 4000);

    return () => clearInterval(interval);
  }, [isSimulatingLive]);

  // Derived counts
  const criticalCount = alertZones.filter((z) => z.riskLevel === 'critical').length;
  const warningCount = alertZones.filter((z) => z.riskLevel === 'warning').length;
  const overflowingStationsCount = stations.filter((s) => s.currentLevelM >= s.bankLevelM).length;

  const handleUpvoteReport = (reportId: string) => {
    setCitizenReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, upvotes: r.upvotes + 1 } : r))
    );
  };

  const handleAddReport = (newReport: CitizenReport) => {
    setCitizenReports((prev) => [newReport, ...prev]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Prompt',sans-serif]">
      {/* 1. Header (Follows Top Bar Contract) */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        onOpenGuideModal={() => setIsGuideModalOpen(true)}
        criticalAlertsCount={criticalCount}
      />

      {/* 2. Real-Time Emergency Operational Ticker */}
      <EmergencyTicker
        isSimulatingLive={isSimulatingLive}
        setIsSimulatingLive={setIsSimulatingLive}
        lastTickTime={lastTickTime}
        onOpenNotifyModal={() => setIsNotifyModalOpen(true)}
        criticalCount={criticalCount}
        warningCount={warningCount}
      />

      {/* 3. Main Workspace Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* TAB 1: OVERVIEW & GIS MAP */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* National Hydrological Overview KPI Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div
                onClick={() => setActiveTab('stations')}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-4 rounded-xl cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Waves className="w-4 h-4 text-cyan-400" />
                    สถานีตรวจวัดน้ำล้นตลิ่ง
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-cyan-400" />
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-bold font-mono text-red-400 tabular-nums">
                    {overflowingStationsCount}
                  </span>
                  <span className="text-xs text-slate-400">/ {stations.length} สถานีหลัก</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  อยุธยา, อุบลฯ, สุโขทัย เกิน 100%
                </p>
              </div>

              <div
                onClick={() => setActiveTab('alerts')}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-4 rounded-xl cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span className="flex items-center gap-1.5 font-medium">
                    <ShieldAlert className="w-4 h-4 text-red-500" />
                    พื้นที่เตือนภัยสีแดง
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-red-400" />
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-bold font-mono text-red-400 tabular-nums">
                    {criticalCount}
                  </span>
                  <span className="text-xs text-slate-400">จังหวัดเสี่ยงภัยสูง</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  น้ำท่วมขัง 60-110 ซม. สั่งอพยพด่วน
                </p>
              </div>

              <div
                onClick={() => setActiveTab('dams')}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-4 rounded-xl cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Database className="w-4 h-4 text-indigo-400" />
                    อัตราการระบายเขื่อนเจ้าพระยา
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400" />
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-bold font-mono text-amber-300 tabular-nums">
                    2,190
                  </span>
                  <span className="text-xs text-slate-400">ลบ.ม./วินาที</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  ท้ายเขื่อน จ.ชัยนาท-สิงห์บุรี-อ่างทอง
                </p>
              </div>

              <div
                onClick={() => setActiveTab('shelters')}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-4 rounded-xl cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Home className="w-4 h-4 text-amber-400" />
                    ศูนย์พักพิงพร้อมใช้งาน
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-amber-400" />
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400 tabular-nums">
                    {shelters.length}
                  </span>
                  <span className="text-xs text-slate-400">ศูนย์ประสานงานหลัก</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  รองรับได้ 2,450 คน มีหน่วยแพทย์
                </p>
              </div>
            </div>

            {/* Interactive GIS Flood Map Component */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-cyan-400" />
                    แผนที่สถานการณ์น้ำ & โซนพื้นที่เสี่ยงภัยอุทกภัย (Interactive Flood GIS Map)
                  </h2>
                </div>
                <div className="text-xs text-slate-400 hidden sm:flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                  <span>เซนเซอร์โทรมาตรอัปเดตอัตโนมัติ</span>
                </div>
              </div>

              <GisFloodMap
                stations={stations}
                alertZones={alertZones}
                dams={dams}
                shelters={shelters}
                onSelectStation={(st) => setSelectedStation(st)}
                onSelectAlertZone={(zone) => setSelectedAlertZone(zone)}
              />
            </div>

            {/* Satellite Analysis & Critical Basin Focus Split Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Satellite Inundation Visual Card */}
              <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
                <div className="relative h-56 sm:h-64 bg-slate-950 overflow-hidden">
                  <img
                    src="/src/assets/images/flood_monitoring_satellite_1791518025544.jpg"
                    alt="ภาพถ่ายดาวเทียมตรวจวัดมวลน้ำท่วมลุ่มน้ำเจ้าพระยา"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded border border-cyan-500/40 text-[11px] text-cyan-300 font-mono">
                    🛰️ GISTDA Satellite Water Layer
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-base font-bold text-white">
                      การวิเคราะห์ภาพถ่ายดาวเทียมพื้นที่น้ำท่วมขัง
                    </h4>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                      ภาพสะท้อนดาวเทียมแสดงมวลน้ำแผ่กว้างในลุ่มน้ำเจ้าพระยาตอนล่าง
                      และลุ่มน้ำยม-น่าน โดยมีพื้นที่น้ำหลากทุ่งเกษตรกรรมนอกคันกั้นน้ำมากกว่า 1.2
                      แสนไร่ ช่วยชะลอน้ำไม่ให้กระทบพื้นที่เศรษฐกิจชั้นในของกรุงเทพฯ
                    </p>
                  </div>
                  <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between text-xs">
                    <span className="text-slate-400">สถานะคันกั้นน้ำ กทม.:</span>
                    <span className="text-emerald-400 font-medium">แนวป้องกันหลักยังปลอดภัย</span>
                  </div>
                </div>
              </div>

              {/* Critical Alert Spotlight List */}
              <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      พื้นที่เสี่ยงภัยวิกฤตที่ต้องเฝ้าระวังสูงสุดใน 24 ชม.
                    </h4>
                    <button
                      onClick={() => setActiveTab('alerts')}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer"
                    >
                      ดูประกาศทั้งหมด ({alertZones.length}) →
                    </button>
                  </div>

                  <div className="space-y-3">
                    {alertZones.slice(0, 3).map((zone) => (
                      <div
                        key={zone.id}
                        onClick={() => setSelectedAlertZone(zone)}
                        className="p-3.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-950/60 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            จ.{zone.province} (อ.{zone.district})
                          </span>
                          <span className="font-mono text-xs text-amber-300 font-bold">
                            น้ำท่วมขัง: {zone.waterDepthText}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-1">{zone.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/40 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-cyan-300">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>หากต้องการความช่วยเหลือฉุกเฉิน สามารถแจ้งตำแหน่งผ่านระบบได้ตลอดเวลา</span>
                  </div>
                  <button
                    onClick={() => setIsReportModalOpen(true)}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold shrink-0 cursor-pointer"
                  >
                    แจ้งเหตุทันที
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TELEMETRY STATIONS */}
        {activeTab === 'stations' && (
          <TelemetryStationsTable
            stations={stations}
            onSelectStation={(st) => setSelectedStation(st)}
          />
        )}

        {/* TAB 3: RISK ALERTS */}
        {activeTab === 'alerts' && (
          <RiskAlertsPanel
            alertZones={alertZones}
            onSelectZone={(zone) => setSelectedAlertZone(zone)}
            onNavigateToShelters={() => setActiveTab('shelters')}
          />
        )}

        {/* TAB 4: DAM CAPACITY */}
        {activeTab === 'dams' && <DamCapacityTracker dams={dams} />}

        {/* TAB 5: SHELTERS & CITIZEN REPORTING */}
        {activeTab === 'shelters' && (
          <ShelterAndHelpPanel
            shelters={shelters}
            citizenReports={citizenReports}
            onOpenReportModal={() => setIsReportModalOpen(true)}
            onUpvoteReport={handleUpvoteReport}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-300">ThaiFloodWatch</span>
              <span>·</span>
              <span>ระบบติดตามระดับน้ำและเตือนภัยน้ำท่วมเรียลไทม์แห่งชาติ</span>
            </div>
            <div className="flex items-center gap-4 text-slate-400">
              <span>สายด่วน 1784 (ปภ.)</span>
              <span>·</span>
              <span>1460 (กรมชลประทาน)</span>
              <span>·</span>
              <span>1669 (การแพทย์ฉุกเฉิน)</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Modal Dialogs */}
      {selectedStation && (
        <StationDetailModal
          station={selectedStation}
          onClose={() => setSelectedStation(null)}
        />
      )}

      {selectedAlertZone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <span className="text-xs px-2 py-0.5 rounded font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                  {selectedAlertZone.riskLevel === 'critical'
                    ? '🔴 พื้นที่วิกฤตน้ำท่วมฉับพลัน'
                    : '🟠 พื้นที่เตือนภัย'}
                </span>
                <h3 className="text-lg font-bold text-white mt-1.5">
                  จ.{selectedAlertZone.province} (อ.{selectedAlertZone.district})
                </h3>
              </div>
              <button
                onClick={() => setSelectedAlertZone(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800 mb-4">
              {selectedAlertZone.description}
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs mb-4">
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400">ระดับน้ำท่วมขัง:</span>
                <p className="font-mono font-bold text-amber-300 text-sm mt-0.5">
                  {selectedAlertZone.waterDepthText}
                </p>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400">การสัญจร:</span>
                <p
                  className={`font-semibold text-xs mt-0.5 ${
                    selectedAlertZone.roadPassable ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {selectedAlertZone.roadPassable ? 'ผ่านได้ระมัดระวัง' : 'รถเล็กห้ามผ่าน'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  setSelectedAlertZone(null);
                  setActiveTab('shelters');
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg cursor-pointer"
              >
                ค้นหาศูนย์พักพิงใกล้เคียง
              </button>
              <button
                onClick={() => setSelectedAlertZone(null)}
                className="px-4 py-2 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      <ReportFloodModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSubmitReport={handleAddReport}
      />

      <EmergencyGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
      />

      <NotificationSettingsModal
        isOpen={isNotifyModalOpen}
        onClose={() => setIsNotifyModalOpen(false)}
      />
    </div>
  );
}
