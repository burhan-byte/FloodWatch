import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { NEEDS, type Need, type Status } from '../../shared/schema';
import { CaseCard } from '../components/CaseCard';
import { HelpMap } from '../components/HelpMap';
import { distanceKm, type LatLng } from '../lib/geo';
import { NEED_ICON, NEED_LABEL } from '../lib/labels';
import { sortCases } from '../lib/urgency';
import { useCases } from '../lib/useCases';

const NEAR_ME_KM = 20;

export default function Home() {
  const [needFilter, setNeedFilter] = useState<Need | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [nearMe, setNearMe] = useState(false);
  const [locating, setLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const statuses: Status[] = showResolved ? ['open', 'claimed', 'resolved'] : ['open', 'claimed'];
  const { cases, loading, error, online } = useCases(statuses);

  const visible = useMemo(() => {
    const filtered = cases.filter(
      (c) =>
        (!needFilter || c.needs.includes(needFilter)) &&
        (!nearMe || !origin || distanceKm(origin, c) <= NEAR_ME_KM)
    );
    return sortCases(filtered, origin);
  }, [cases, needFilter, nearMe, origin]);

  const openCount = cases.filter((c) => c.status === 'open').length;

  const toggleNearMe = () => {
    if (nearMe) return setNearMe(false);
    if (!navigator.geolocation) return setGpsError('อุปกรณ์นี้หาตำแหน่งไม่ได้');
    setLocating(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setNearMe(true);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setGpsError(
          err.code === err.PERMISSION_DENIED ? 'ไม่ได้รับอนุญาตให้ใช้ตำแหน่ง' : 'หาตำแหน่งไม่ได้ ลองใหม่อีกครั้ง'
        );
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  };

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-xs whitespace-nowrap ${
      active ? 'border-cyan-500 bg-cyan-500/20 text-cyan-200' : 'border-slate-700 bg-slate-900 text-slate-300'
    }`;

  return (
    <div className="space-y-4">
      {!online && (
        <div role="status" className="rounded-lg border border-amber-700/60 bg-amber-950/60 px-3 py-2 text-xs text-amber-200">
          ออฟไลน์ ข้อมูลอาจไม่อัปเดต กำลังเชื่อมต่อใหม่...
        </div>
      )}

      <Link
        href="/new"
        className="flex items-center justify-between rounded-2xl bg-red-600 px-5 py-4 text-white shadow-lg hover:bg-red-500"
      >
        <span>
          <span className="block text-lg font-bold">🆘 ต้องการความช่วยเหลือ?</span>
          <span className="text-sm text-red-100">แจ้งตำแหน่งและสิ่งที่ต้องการ อาสาในพื้นที่จะเห็นทันที</span>
        </span>
        <span className="text-2xl">→</span>
      </Link>

      <div className="flex items-baseline justify-between">
        <h1 className="text-base font-bold text-white">คำขอความช่วยเหลือ</h1>
        <span className="text-sm text-slate-400">
          รอความช่วยเหลือ <span className="font-bold text-red-400">{openCount}</span> เคส
        </span>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <button type="button" aria-pressed={needFilter === null} className={chip(needFilter === null)} onClick={() => setNeedFilter(null)}>
          ทั้งหมด
        </button>
        {NEEDS.map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={needFilter === n}
            className={chip(needFilter === n)}
            onClick={() => setNeedFilter(needFilter === n ? null : n)}
          >
            {NEED_ICON[n]} {NEED_LABEL[n]}
          </button>
        ))}
        <button type="button" aria-pressed={nearMe} disabled={locating} className={chip(nearMe)} onClick={toggleNearMe}>
          📍 {locating ? 'กำลังหาตำแหน่ง...' : `ใกล้ฉัน (${NEAR_ME_KM} กม.)`}
        </button>
        <button type="button" aria-pressed={showResolved} className={chip(showResolved)} onClick={() => setShowResolved((v) => !v)}>
          ✅ แสดงเคสที่ช่วยแล้ว
        </button>
      </div>
      {gpsError && (
        <p role="status" className="text-xs text-amber-300">
          {gpsError}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <HelpMap cases={visible} className="h-[55vh] min-h-[320px] lg:h-[640px]" />
        <section aria-label="รายการเคส" className="space-y-2 lg:max-h-[640px] lg:overflow-y-auto lg:pr-1">
          {loading && <p className="text-sm text-slate-400">กำลังโหลด...</p>}
          {error && <p className="text-sm text-red-300">{error}</p>}
          {!loading && !error && visible.length === 0 && (
            <p className="rounded-xl border border-slate-800 p-4 text-sm text-slate-400">ยังไม่มีคำขอในเงื่อนไขนี้</p>
          )}
          {visible.map((c) => (
            <CaseCard key={c.id} c={c} origin={origin} />
          ))}
        </section>
      </div>
    </div>
  );
}
