import React, { useState } from 'react';
import { EvacuationShelter, CitizenReport } from '../types/flood';
import { Home, Phone, Users, ThumbsUp, AlertCircle, PlusCircle, CheckCircle2, MapPin, HeartHandshake } from 'lucide-react';

interface ShelterAndHelpPanelProps {
  shelters: EvacuationShelter[];
  citizenReports: CitizenReport[];
  onOpenReportModal: () => void;
  onUpvoteReport: (reportId: string) => void;
}

export const ShelterAndHelpPanel: React.FC<ShelterAndHelpPanelProps> = ({
  shelters,
  citizenReports,
  onOpenReportModal,
  onUpvoteReport,
}) => {
  const [shelterProvinceFilter, setShelterProvinceFilter] = useState('all');

  const filteredShelters = shelters.filter((s) => {
    if (shelterProvinceFilter === 'all') return true;
    return s.province === shelterProvinceFilter;
  });

  const shelterProvinces = Array.from(new Set(shelters.map((s) => s.province)));

  return (
    <div className="space-y-6">
      {/* Hero Rescue Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-center">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold mb-2">
              <HeartHandshake className="w-4 h-4" />
              <span>ศูนย์ประสานงานบรรเทาทุกข์และช่วยเหลือผู้ประสบภัย 24 ชม.</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white leading-tight">
              ต้องการความช่วยเหลือฉุกเฉิน หรือค้นหาจุดพักพิงปลอดภัย
            </h3>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              หากระดับน้ำท่วมสูงถึงชั้น 2 มีผู้ป่วยติดเตียง เด็ก หรือผู้สูงอายุติดค้างในบ้าน
              สามารถโทรแจ้งสายด่วนกู้ภัย ปภ. 1784 หรือส่งพิกัดรายงานผ่านระบบเพื่อให้หน่วยเรือกู้ภัยเข้าช่วยเหลือได้ทันที
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-5">
              <button
                onClick={onOpenReportModal}
                className="px-4 py-2.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>รายงานสถานการณ์ / ปักหมุดขอความช่วยเหลือ</span>
              </button>
              <a
                href="tel:1784"
                className="px-4 py-2.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors flex items-center gap-2"
              >
                <Phone className="w-4 h-4 text-cyan-400" />
                <span>โทรสายด่วน ปภ. 1784 (ฟรี 24 ชม.)</span>
              </a>
            </div>
          </div>

          <div className="lg:col-span-5 relative min-h-[220px] bg-slate-950 overflow-hidden">
            <img
              src="/src/assets/images/flood_rescue_operations_1791518040619.jpg"
              alt="ปฏิบัติการเรือกู้ภัยช่วยเหลือผู้ประสบอุทกภัย"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                // Fallback container
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Evacuation Shelters Directory (Col 7) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div>
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <Home className="w-4 h-4 text-amber-400" />
                จุดอพยพและศูนย์พักพิงชั่วคราว (Official Shelters)
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                มีสิ่งอำนวยความสะดวก อาหารปรุงสุก น้ำดื่ม และหน่วยแพทย์รองรับ
              </p>
            </div>

            <select
              value={shelterProvinceFilter}
              onChange={(e) => setShelterProvinceFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 cursor-pointer"
            >
              <option value="all">ทุกจังหวัด ({shelters.length} ศูนย์)</option>
              {shelterProvinces.map((prov) => (
                <option key={prov} value={prov}>
                  {prov}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            {filteredShelters.map((sh) => {
              const occupancyPct = Math.round((sh.currentOccupants / sh.capacityPeople) * 100);
              const isNearlyFull = occupancyPct >= 85;

              return (
                <div
                  key={sh.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 sm:p-5 rounded-xl transition-all"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h5 className="text-base font-bold text-white">{sh.name}</h5>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>{sh.address} (อ.{sh.district} จ.{sh.province})</span>
                      </p>
                    </div>

                    <span
                      className={`text-[11px] px-2 py-0.5 rounded font-mono font-medium shrink-0 ${
                        isNearlyFull
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {isNearlyFull ? 'ใกล้เต็ม' : 'เปิดรับผู้ประสบภัย'}
                    </span>
                  </div>

                  {/* Occupancy bar */}
                  <div className="space-y-1 my-3 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        ความจุผู้พักพิง:
                      </span>
                      <span className="font-mono text-slate-200">
                        {sh.currentOccupants} / {sh.capacityPeople} คน ({occupancyPct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          isNearlyFull ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, occupancyPct)}%` }}
                      />
                    </div>
                  </div>

                  {/* Facilities */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {sh.facilities.map((fac, i) => (
                      <span
                        key={i}
                        className="text-[11px] px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800"
                      >
                        ✓ {fac}
                      </span>
                    ))}
                  </div>

                  {/* Call Hotline for this shelter */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-400">ติดต่อประจำศูนย์:</span>
                    <a
                      href={`tel:${sh.contactPhone}`}
                      className="font-mono font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{sh.contactPhone}</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Citizen Field Reports Feed (Col 5) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div>
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-cyan-400" />
                รายงานน้ำท่วมจากภาคสนาม (Citizen Feed)
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                ข้อมูลสถานการณ์สดจากประชาชนในพื้นที่
              </p>
            </div>
            <button
              onClick={onOpenReportModal}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer"
            >
              + เขียนรายงาน
            </button>
          </div>

          <div className="space-y-3">
            {citizenReports.map((report) => (
              <div
                key={report.id}
                className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2.5 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-200">
                      {report.reporterName}
                    </span>
                    {report.verified && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-cyan-400 font-mono">
                        <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                        ยืนยันแล้ว
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {report.timestamp}
                  </span>
                </div>

                <div>
                  <p className="font-medium text-slate-300 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-red-400 shrink-0" />
                    <span>{report.locationName} (จ.{report.province})</span>
                  </p>
                  <p className="text-slate-300 mt-1 leading-relaxed bg-slate-950/50 p-2.5 rounded border border-slate-800/60">
                    {report.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-amber-300">
                      ระดับน้ำ: ~{report.waterLevelCm} ซม.
                    </span>
                    <span className="text-slate-600">·</span>
                    <span
                      className={`text-[11px] ${
                        report.roadStatus === 'impassable'
                          ? 'text-red-400 font-medium'
                          : report.roadStatus === 'only_high_vehicles'
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {report.roadStatus === 'impassable'
                        ? 'ทางขาด/ผ่านไม่ได้'
                        : report.roadStatus === 'only_high_vehicles'
                        ? 'เฉพาะรถยกสูง'
                        : 'รถผ่านได้'}
                    </span>
                  </div>

                  <button
                    onClick={() => onUpvoteReport(report.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <ThumbsUp className="w-3 h-3 text-cyan-400" />
                    <span className="font-mono tabular-nums">{report.upvotes}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
