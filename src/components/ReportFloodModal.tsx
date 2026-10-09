import React, { useState } from 'react';
import { X, Send, AlertTriangle, CheckCircle, Camera } from 'lucide-react';
import { CitizenReport } from '../types/flood';

interface ReportFloodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitReport: (report: CitizenReport) => void;
}

export const ReportFloodModal: React.FC<ReportFloodModalProps> = ({
  isOpen,
  onClose,
  onSubmitReport,
}) => {
  const [reporterName, setReporterName] = useState('');
  const [locationName, setLocationName] = useState('');
  const [province, setProvince] = useState('พระนครศรีอยุธยา');
  const [waterLevelCm, setWaterLevelCm] = useState(40);
  const [roadStatus, setRoadStatus] = useState<'passable' | 'only_high_vehicles' | 'impassable'>('only_high_vehicles');
  const [description, setDescription] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationName.trim() || !description.trim()) return;

    const newReport: CitizenReport = {
      id: `rep-${Date.now()}`,
      timestamp: 'เพิ่งส่งเมื่อสักครู่',
      reporterName: reporterName.trim() || 'พลเมืองดี',
      locationName: locationName.trim(),
      province,
      waterLevelCm: Number(waterLevelCm),
      roadStatus,
      description: description.trim(),
      upvotes: 1,
      verified: true,
    };

    onSubmitReport(newReport);
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2 text-red-400 font-bold text-base">
            <AlertTriangle className="w-5 h-5" />
            <span>รายงานสถานการณ์น้ำท่วม / แจ้งเหตุฉุกเฉิน</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {isSuccess ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-white">บันทึกรายงานสำเร็จ</h4>
            <p className="text-xs text-slate-300">
              ข้อมูลของท่านถูกส่งเข้าสู่ระบบแผนที่และฟีดรายงานภาคสนามเพื่อประสานหน่วยงานช่วยเหลือแล้ว
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">ชื่อผู้รายงาน (หรือ นามสมมุติ)</label>
                <input
                  type="text"
                  placeholder="เช่น สมชาย ว."
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">จังหวัด</label>
                <select
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="พระนครศรีอยุธยา">พระนครศรีอยุธยา</option>
                  <option value="อุบลราชธานี">อุบลราชธานี</option>
                  <option value="สุโขทัย">สุโขทัย</option>
                  <option value="นครสวรรค์">นครสวรรค์</option>
                  <option value="ชัยนาท">ชัยนาท</option>
                  <option value="เชียงใหม่">เชียงใหม่</option>
                  <option value="นนทบุรี">นนทบุรี</option>
                  <option value="กรุงเทพมหานคร">กรุงเทพมหานคร</option>
                  <option value="สุราษฎร์ธานี">สุราษฎร์ธานี</option>
                  <option value="สงขลา">สงขลา</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">
                จุดเกิดเหตุ / ชื่อถนน / หมู่บ้าน <span className="text-red-400">*</span>
              </label>
              <input
                required
                type="text"
                placeholder="เช่น ถ.เสนา-ผักไห่ กม.14 หน้าวัดโบสถ์"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">
                  ประมาณความสูงระดับน้ำ (ซม.): <span className="font-mono text-cyan-400 font-bold">{waterLevelCm} ซม.</span>
                </label>
                <input
                  type="range"
                  min="5"
                  max="200"
                  step="5"
                  value={waterLevelCm}
                  onChange={(e) => setWaterLevelCm(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">สภาพการสัญจรของยานพาหนะ</label>
                <select
                  value={roadStatus}
                  onChange={(e) => setRoadStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="passable">รถทุกชนิดยังผ่านได้</option>
                  <option value="only_high_vehicles">เฉพาะรถกระบะยกสูง / รถ 6 ล้อ</option>
                  <option value="impassable">ทางขาด / รถเล็กห้ามผ่านเด็ดขาด</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">
                รายละเอียดเหตุการณ์ & ความช่วยเหลือที่ต้องการ <span className="text-red-400">*</span>
              </label>
              <textarea
                required
                rows={3}
                placeholder="เช่น น้ำเริ่มไหลทะลักเข้าใต้ถุนบ้านแล้ว ต้องการเรือช่วยอพยพผู้สูงอายุ มีเด็กเล็ก 2 คน..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-5 py-2 font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg flex items-center gap-2 cursor-pointer shadow-sm transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>ส่งข้อมูลรายงาน</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
