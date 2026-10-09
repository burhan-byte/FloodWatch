import React, { useState } from 'react';
import { X, Bell, Smartphone, Volume2, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [selectedProvince, setSelectedProvince] = useState('พระนครศรีอยุธยา');
  const [phone, setPhone] = useState('081-234-5678');
  const [notifyLevel, setNotifyLevel] = useState<'critical_only' | 'all'>('critical_only');
  const [isSaved, setIsSaved] = useState(false);
  const [simulatedAlertTriggered, setSimulatedAlertTriggered] = useState(false);

  if (!isOpen) return null;

  // Synthesize clean emergency chime with Web Audio API
  const playAlertChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch {
      // AudioContext fallback
    }
  };

  const handleTestNotification = () => {
    playAlertChime();
    setSimulatedAlertTriggered(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-base">
            <Bell className="w-5 h-5" />
            <span>ตั้งค่าระบบเตือนภัยฉุกเฉิน (SMS & LINE Alert)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4 text-xs">
          {isSaved ? (
            <div className="py-8 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <h4 className="text-lg font-bold text-white">บันทึกการตั้งค่าสำเร็จ</h4>
              <p className="text-slate-300">
                ระบบจะส่งข้อความแจ้งเตือนทันทีเมื่อระดับน้ำในเขต จ.{selectedProvince} เข้าสู่เกณฑ์วิกฤต
              </p>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">เลือกจังหวัดที่ต้องการเฝ้าระวัง</label>
                <select
                  value={selectedProvince}
                  onChange={(e) => setSelectedProvince(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="พระนครศรีอยุธยา">พระนครศรีอยุธยา (ลุ่มน้ำเจ้าพระยา)</option>
                  <option value="อุบลราชธานี">อุบลราชธานี (ลุ่มน้ำมูล)</option>
                  <option value="สุโขทัย">สุโขทัย (ลุ่มน้ำยม)</option>
                  <option value="นครสวรรค์">นครสวรรค์ (ต้นแม่น้ำเจ้าพระยา)</option>
                  <option value="ชัยนาท">ชัยนาท (ท้ายเขื่อนเจ้าพระยา)</option>
                  <option value="เชียงใหม่">เชียงใหม่ (ลุ่มน้ำปิง)</option>
                  <option value="นนทบุรี">นนทบุรี (น้ำหนุนเจ้าพระยา)</option>
                  <option value="กรุงเทพมหานคร">กรุงเทพมหานคร (น้ำทะเลหนุน)</option>
                  <option value="สุราษฎร์ธานี">สุราษฎร์ธานี (ลุ่มน้ำตาปี)</option>
                  <option value="สงขลา">สงขลา (คลองอู่ตะเภา)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">เบอร์โทรศัพท์สำหรับรับ SMS ฉุกเฉิน</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="08X-XXX-XXXX"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">ระดับการแจ้งเตือน</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNotifyLevel('critical_only')}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition-colors ${
                      notifyLevel === 'critical_only'
                        ? 'bg-red-950/40 border-red-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <p className="font-semibold text-xs">🔴 เฉพาะวิกฤตล้นตลิ่ง</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">เตือนเมื่อถึงเกณฑ์สั่งอพยพ</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNotifyLevel('all')}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition-colors ${
                      notifyLevel === 'all'
                        ? 'bg-cyan-950/40 border-cyan-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <p className="font-semibold text-xs">🟠 เตือนภัย + เฝ้าระวัง</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">เตือนล่วงหน้าเมื่อน้ำขึ้นเร็ว</p>
                  </button>
                </div>
              </div>

              {/* Test Sound & Simulator Box */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-medium flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-cyan-400" />
                    ทดสอบสัญญาณเสียงเตือน & การแจ้งเตือนจำลอง
                  </span>
                  <button
                    type="button"
                    onClick={handleTestNotification}
                    className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-medium text-[11px] cursor-pointer"
                  >
                    กดทดสอบเสียงเตือน
                  </button>
                </div>

                {simulatedAlertTriggered && (
                  <div className="p-3 bg-red-950/60 border border-red-500/50 rounded-lg space-y-1 animate-in zoom-in duration-200">
                    <div className="flex items-center gap-1.5 text-red-400 font-bold text-[11px]">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>[เตือนภัยฉุกเฉินระดับสูงสุด] จ.{selectedProvince}</span>
                    </div>
                    <p className="text-[11px] text-slate-200">
                      ระดับน้ำแม่น้ำสูงกว่าตลิ่ง 40 ซม. ขอให้ประชาชนริมฝั่งเตรียมยกของขึ้นที่สูงทันที ติดต่อสายด่วน ปภ. 1784
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-slate-400 hover:text-white bg-slate-800 rounded-lg cursor-pointer"
                >
                  ปิด
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg cursor-pointer shadow-sm transition-colors"
                >
                  บันทึกการสมัครรับแจ้งเตือน
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
