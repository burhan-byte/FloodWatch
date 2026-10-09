import React, { useState, useMemo } from 'react';
import { GaugingStation } from '../types/flood';
import { Search, Filter, TrendingUp, TrendingDown, Minus, ArrowUpDown, ChevronRight, Activity, Download } from 'lucide-react';

interface TelemetryStationsTableProps {
  stations: GaugingStation[];
  onSelectStation: (st: GaugingStation) => void;
}

export const TelemetryStationsTable: React.FC<TelemetryStationsTableProps> = ({
  stations,
  onSelectStation,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [basinFilter, setBasinFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'capacity' | 'flow' | 'level'>('capacity');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Unique basins for filter dropdown
  const basins = useMemo(() => {
    return Array.from(new Set(stations.map((s) => s.basin)));
  }, [stations]);

  // Filter & sort logic
  const filteredStations = useMemo(() => {
    return stations
      .filter((s) => {
        const matchesSearch =
          s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.province.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.riverName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesBasin = basinFilter === 'all' || s.basin === basinFilter;
        const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
        return matchesSearch && matchesBasin && matchesStatus;
      })
      .sort((a, b) => {
        let valA = a.capacityPercent;
        let valB = b.capacityPercent;
        if (sortBy === 'flow') {
          valA = a.flowRateM3s;
          valB = b.flowRateM3s;
        } else if (sortBy === 'level') {
          valA = a.currentLevelM;
          valB = b.currentLevelM;
        }
        return sortOrder === 'desc' ? valB - valA : valA - valB;
      });
  }, [stations, searchTerm, basinFilter, statusFilter, sortBy, sortOrder]);

  const handleDownloadCsv = () => {
    const headers = ['รหัสสถานี,ชื่อสถานี,แม่น้ำ,จังหวัด,ลุ่มน้ำ,ระดับปัจจุบัน(ม.รทก.),ระดับตลิ่ง(ม.รทก.),ความจุลำน้ำ(%),อัตราการไหล(ลบ.ม./วิ),สถานะ'];
    const rows = filteredStations.map((s) =>
      `"${s.code}","${s.name}","${s.riverName}","${s.province}","${s.basin}",${s.currentLevelM},${s.bankLevelM},${s.capacityPercent},${s.flowRateM3s},"${s.status}"`
    );
    const csvContent = '\uFEFF' + headers.concat(rows).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `water_telemetry_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Table Header Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              ตารางข้อมูลระดับน้ำโทรมาตรรายสถานี (Live Hydrological Gauges)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              ข้อมูลตรวจวัดระดับน้ำและอัตราการไหลแบบเรียลไทม์จากระบบเซนเซอร์ภาคสนาม
            </p>
          </div>

          <button
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ส่งออก CSV</span>
          </button>
        </div>

        {/* Search & Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
          {/* Search box */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหารหัส เช่น C.29, เชียงใหม่, ปิง..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Basin selector */}
          <div>
            <select
              value={basinFilter}
              onChange={(e) => setBasinFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="all">ทุกลุ่มน้ำ ({basins.length})</option>
              {basins.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="all">ทุกสถานะความเสี่ยง</option>
              <option value="critical">🔴 วิกฤตล้นตลิ่ง (&gt;100%)</option>
              <option value="warning">🟠 เตือนภัย (90-100%)</option>
              <option value="watch">🟡 เฝ้าระวัง (75-90%)</option>
              <option value="normal">🟢 ปกติ (&lt;75%)</option>
            </select>
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-1">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="capacity">เรียงตาม % ความจุลำน้ำ</option>
              <option value="flow">เรียงตามอัตราการไหล</option>
              <option value="level">เรียงตามระดับน้ำ</option>
            </select>
            <button
              onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
              className="p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 hover:text-white cursor-pointer"
              title="สลับลำดับ"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Table Data */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-medium">
              <th className="py-3 px-4">รหัส / สถานี</th>
              <th className="py-3 px-4">แม่น้ำ / ลุ่มน้ำ</th>
              <th className="py-3 px-4">จังหวัด</th>
              <th className="py-3 px-4 text-right">ระดับน้ำ (ม.รทก.)</th>
              <th className="py-3 px-4 text-right">ระดับตลิ่ง</th>
              <th className="py-3 px-4 text-right">ความจุลำน้ำ</th>
              <th className="py-3 px-4 text-right">อัตราไหล (ลบ.ม./วิ)</th>
              <th className="py-3 px-4 text-center">แนวโน้ม</th>
              <th className="py-3 px-4 text-center">สถานะ</th>
              <th className="py-3 px-4 text-right">การกระทำ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-normal">
            {filteredStations.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-slate-500">
                  ไม่พบสถานีที่ตรงกับเงื่อนไขการค้นหา
                </td>
              </tr>
            ) : (
              filteredStations.map((st) => {
                const isCrit = st.status === 'critical';
                const isWarn = st.status === 'warning';
                const isWatch = st.status === 'watch';

                return (
                  <tr
                    key={st.id}
                    onClick={() => onSelectStation(st)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    {/* Code & Name */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-cyan-400 bg-cyan-950/50 border border-cyan-800/50 px-1.5 py-0.5 rounded">
                          {st.code}
                        </span>
                        <span className="font-medium text-slate-200 group-hover:text-cyan-300 transition-colors">
                          {st.name}
                        </span>
                      </div>
                    </td>

                    {/* River & Basin */}
                    <td className="py-3.5 px-4 text-slate-300">
                      <div>{st.riverName}</div>
                      <span className="text-[11px] text-slate-500">{st.basin}</span>
                    </td>

                    {/* Province */}
                    <td className="py-3.5 px-4 text-slate-300 font-medium">
                      {st.province}
                    </td>

                    {/* Current Level */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold tabular-nums text-slate-100">
                      {st.currentLevelM.toFixed(2)}
                    </td>

                    {/* Bank Level */}
                    <td className="py-3.5 px-4 text-right font-mono text-slate-400 tabular-nums">
                      {st.bankLevelM.toFixed(2)}
                    </td>

                    {/* Capacity % */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex flex-col items-end">
                        <span
                          className={`font-mono font-bold tabular-nums ${
                            isCrit
                              ? 'text-red-400'
                              : isWarn
                              ? 'text-amber-400'
                              : isWatch
                              ? 'text-yellow-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {st.capacityPercent.toFixed(1)}%
                        </span>
                        {/* Tiny capacity gauge bar */}
                        <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
                          <div
                            className={`h-full ${
                              isCrit
                                ? 'bg-red-500'
                                : isWarn
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{
                              width: `${Math.min(100, st.capacityPercent)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Flow Rate */}
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-200">
                      {st.flowRateM3s.toLocaleString()}
                    </td>

                    {/* Trend */}
                    <td className="py-3.5 px-4 text-center">
                      {st.trend === 'rising' ? (
                        <span className="inline-flex items-center text-red-400 text-[11px]" title="ระดับน้ำเพิ่มขึ้น">
                          <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> ขึ้น
                        </span>
                      ) : st.trend === 'falling' ? (
                        <span className="inline-flex items-center text-emerald-400 text-[11px]" title="ระดับน้ำลดลง">
                          <TrendingDown className="w-3.5 h-3.5 mr-0.5" /> ลง
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-slate-400 text-[11px]" title="ระดับน้ำทรงตัว">
                          <Minus className="w-3.5 h-3.5 mr-0.5" /> ทรง
                        </span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${
                          isCrit
                            ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                            : isWarn
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            : isWatch
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        }`}
                      >
                        {isCrit
                          ? 'วิกฤตล้นตลิ่ง'
                          : isWarn
                          ? 'เตือนภัย'
                          : isWatch
                          ? 'เฝ้าระวัง'
                          : 'ปกติ'}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectStation(st);
                        }}
                        className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer"
                      >
                        <span>กราฟ & รายละเอียด</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
