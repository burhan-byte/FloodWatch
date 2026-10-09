import React, { useState } from 'react';
import { X, CheckSquare, Square, Zap, Shield, PhoneCall, AlertOctagon, Heart, LifeBuoy } from 'lucide-react';

interface EmergencyGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmergencyGuideModal: React.FC<EmergencyGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    c1: true,
    c2: false,
    c3: true,
    c4: false,
    c5: false,
    c6: false,
    c7: true,
  });

  if (!isOpen) return null;

  const toggleCheck = (key: string) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const checklistItems = [
    { id: 'c1', title: 'น้ำดื่มสะอาด 3 ลิตร/คน/วัน (สำหรับ 3-5 วัน)', desc: 'รวมถึงอาหารแห้ง อาหารกระป๋องที่ไม่ต้องใช้ความร้อน' },
    { id: 'c2', title: 'ยาสามัญประจำบ้าน & ยาโรคประจำตัวของผู้ป่วย', desc: 'ยาเบาหวาน ความดัน ยาแก้ไข้ ยาแก้ท้องเสีย พลาสเตอร์' },
    { id: 'c3', title: 'ไฟฉายส่องสว่าง & พาวเวอร์แบงก์ชาร์จโทรศัพท์', desc: 'ชาร์จแบตเตอรี่สำรองให้เต็ม 100% เตรียมถ่านไฟฉาย' },
    { id: 'c4', title: 'เอกสารสำคัญใส่ซองพลาสติกกันน้ำ', desc: 'บัตรประชาชน ทะเบียนบ้าน โฉนด สมุดบัญชีธนาคาร ประกันภัย' },
    { id: 'c5', title: 'สับสวิตช์เบรกเกอร์ไฟฟ้าชั้นล่าง', desc: 'ตัดกระแสไฟฟ้าชั้นที่น้ำมีโอกาสท่วมถึง ป้องกันไฟรั่วดูด' },
    { id: 'c6', title: 'ยกเครื่องใช้ไฟฟ้าและเฟอร์นิเจอร์ขึ้นที่สูง', desc: 'ตู้เย็น ทีวี ปลั๊กไฟต่อพ่วง ให้พ้นจากแนวระดับน้ำท่วมสูงสุด' },
    { id: 'c7', title: 'นกหวีด หรือ อุปกรณ์ส่งสัญญาณขอความช่วยเหลือ', desc: 'ใช้ส่งเสียงเตือนเมื่อต้องการให้เรือกู้ภัยเข้าช่วยเหลือยามค่ำคืน' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5 text-amber-400 font-bold text-base">
            <LifeBuoy className="w-5 h-5" />
            <span>คู่มือการเตรียมพร้อมและกระเป๋ายังชีพฉุกเฉิน 72 ชม.</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
          {/* Critical Danger Alert */}
          <div className="bg-red-950/40 border border-red-500/40 rounded-xl p-3.5 flex items-start gap-3">
            <Zap className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <h5 className="font-bold text-white text-sm mb-1">
                ระวังอันตรายจาก "กระแสไฟฟ้ารั่ว" ในน้ำท่วม
              </h5>
              <p className="text-slate-300 leading-relaxed">
                ห้ามเดินลุยน้ำเข้าใกล้เสาไฟฟ้า ป้ายไฟโฆษณา หรือสัมผัสเครื่องใช้ไฟฟ้าที่ยังเสียบปลั๊กเด็ดขาด หากพบระดับน้ำเริ่มท่วมถึงปลั๊กไฟชั้น 1 ให้รีบสับเบรกเกอร์ตัดไฟทันที
              </p>
            </div>
          </div>

          {/* Interactive 72h Survival Checklist */}
          <div>
            <h5 className="font-bold text-white text-sm mb-2 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-cyan-400" />
              เช็กลิสต์จัดกระเป๋าฉุกเฉิน (Survival Kit Checklist)
            </h5>
            <div className="space-y-2 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
              {checklistItems.map((item) => {
                const checked = checklist[item.id];
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleCheck(item.id)}
                    className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <button type="button" className="mt-0.5 text-cyan-400 shrink-0">
                      {checked ? (
                        <CheckSquare className="w-4 h-4 text-cyan-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600" />
                      )}
                    </button>
                    <div>
                      <p
                        className={`font-semibold ${
                          checked ? 'text-slate-200 line-through text-slate-500' : 'text-slate-200'
                        }`}
                      >
                        {item.title}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Emergency Numbers Strip */}
          <div>
            <h5 className="font-bold text-white text-sm mb-2 flex items-center gap-1.5">
              <PhoneCall className="w-4 h-4 text-emerald-400" />
              เบอร์โทรศัพท์ฉุกเฉินสำคัญเมื่อเกิดอุทกภัย
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400">แจ้งเหตุสาธารณภัย ปภ.</span>
                <p className="font-mono font-bold text-white text-sm mt-0.5">1784</p>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400">หน่วยแพทย์กู้ชีพฉุกเฉิน</span>
                <p className="font-mono font-bold text-white text-sm mt-0.5">1669</p>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400">ศูนย์ประสานงานน้ำ กรมชลประทาน</span>
                <p className="font-mono font-bold text-white text-sm mt-0.5">1460</p>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400">ตำรวจทางหลวง (สอบถามเส้นทางน้ำท่วม)</span>
                <p className="font-mono font-bold text-white text-sm mt-0.5">1193</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
          >
            เข้าใจแล้ว / ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
