import { useEffect, useState } from 'react';
import { CircleMarker } from 'react-leaflet';
import { Link, useParams, useSearch } from 'wouter';
import type { PublicCase } from '../../shared/schema';
import { VulnerableBadges } from '../components/CaseCard';
import { BaseMap } from '../components/map/BaseMap';
import { NeedToggles, PeopleCounter } from '../components/RequestFields';
import { ApiError, api } from '../lib/api';
import { clearToken, getTokens, saveToken } from '../lib/caseTokens';
import { timeAgo } from '../lib/format';
import { NEED_ICON, NEED_LABEL, STATUS_COLOR, STATUS_LABEL } from '../lib/labels';
import { useCase } from '../lib/useCase';

const btn = 'min-h-12 w-full rounded-xl px-4 text-sm font-bold disabled:opacity-60';

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const search = useSearch();
  const { data, setData, state } = useCase(id);
  const [tokens, setTokens] = useState(() => getTokens(id));
  const [phone, setPhone] = useState<string | null | undefined>(undefined);
  const [claimName, setClaimName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [flagged, setFlagged] = useState(false);

  // An owner link (?t=...) stores the token on this device and is then removed from the address bar
  useEffect(() => {
    const t = new URLSearchParams(search).get('t');
    if (!t) return;
    saveToken(id, 'owner', t);
    setTokens(getTokens(id));
    window.history.replaceState(null, '', `/r/${id}`);
  }, [id, search]);

  if (state === 'loading') return <p className="text-slate-400">กำลังโหลด...</p>;
  if (state === 'notfound' || (state === 'ready' && !data))
    return (
      <div className="space-y-3">
        <p className="text-slate-300">ไม่พบเคสนี้ อาจถูกซ่อนเพราะถูกแจ้งว่าเป็นเคสปลอม</p>
        <Link href="/" className="text-cyan-400 underline">กลับหน้าหลัก</Link>
      </div>
    );
  if (state === 'error' || !data) return <p className="text-red-300">โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่</p>;

  const c = data;
  const run = async (action: () => Promise<PublicCase | void>, done?: string) => {
    setBusy(true);
    setMessage(null);
    try {
      const updated = await action();
      if (updated) setData(updated);
      if (done) setMessage(done);
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : 'เกิดข้อผิดพลาด');
    } finally {
      setBusy(false);
    }
  };

  const claim = () =>
    run(async () => {
      const { claimToken } = await api.claim(c.id, claimName);
      saveToken(c.id, 'claim', claimToken);
      setTokens(getTokens(c.id));
      return api.get(c.id);
    }, 'รับเคสแล้ว เมื่อช่วยเสร็จอย่าลืมกด "ช่วยเสร็จแล้ว"');

  const release = () =>
    run(async () => {
      const updated = await api.release(c.id, tokens.claim!);
      clearToken(c.id, 'claim');
      setTokens(getTokens(c.id));
      return updated;
    });

  const resolve = (token: string) => run(() => api.resolve(c.id, token), 'ปิดเคสแล้ว ขอบคุณที่ช่วยกัน');

  const flag = () => {
    if (!window.confirm('แจ้งว่าเคสนี้เป็นเคสปลอมหรือก่อกวน?')) return;
    run(async () => {
      await api.flag(c.id);
      setFlagged(true);
    }, 'ขอบคุณที่แจ้ง');
  };

  const isClaimer = !!tokens.claim && c.status === 'claimed';
  const isOwner = !!tokens.owner;
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/" className="text-sm text-cyan-400">← กลับหน้าหลัก</Link>

      <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-lg font-bold text-white">
            {c.needs.map((n) => `${NEED_ICON[n]} ${NEED_LABEL[n]}`).join(' · ')}
          </h1>
          <span
            className="shrink-0 rounded px-2 py-1 text-xs font-bold"
            style={{ color: STATUS_COLOR[c.status], background: `${STATUS_COLOR[c.status]}22` }}
          >
            {STATUS_LABEL[c.status]}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
          <span>👥 {c.peopleCount} คน</span>
          <VulnerableBadges c={c} />
        </div>
        {c.contactName && <p className="text-sm text-slate-300">ผู้แจ้ง: {c.contactName}</p>}
        {c.locationText && <p className="text-sm text-slate-300">📍 {c.locationText}</p>}
        {c.details && <p className="whitespace-pre-wrap text-sm text-slate-200">{c.details}</p>}
        <p className="text-xs text-slate-500">
          แจ้งเมื่อ {timeAgo(c.createdAt)} · อัปเดต {timeAgo(c.updatedAt)}
          {c.status === 'claimed' && c.claimedBy && ` · ${c.claimedBy} กำลังไป (${timeAgo(c.claimedAt!)})`}
        </p>
      </div>

      <BaseMap className="h-64" focus={{ lat: c.lat, lng: c.lng, zoom: 15 }}>
        <CircleMarker
          center={[c.lat, c.lng]}
          radius={11}
          pathOptions={{ color: '#ffffff', weight: 3, fillColor: STATUS_COLOR[c.status], fillOpacity: 1 }}
        />
      </BaseMap>

      <div className="grid grid-cols-2 gap-2">
        {phone ? (
          <a href={`tel:${phone}`} className={`${btn} flex items-center justify-center bg-emerald-600 text-white`}>
            📞 {phone}
          </a>
        ) : (
          <button
            type="button"
            disabled={busy || phone === null}
            className={`${btn} bg-emerald-600 text-white`}
            onClick={() => run(async () => setPhone((await api.revealPhone(c.id)).phone))}
          >
            {phone === null ? 'ไม่มีเบอร์แล้ว' : '📞 แสดงเบอร์'}
          </button>
        )}
        <a href={mapsUrl} target="_blank" rel="noreferrer" className={`${btn} flex items-center justify-center bg-slate-700 text-white`}>
          🧭 นำทาง
        </a>
      </div>

      {c.status === 'open' && (
        <div className="space-y-2 rounded-2xl border border-cyan-800/60 bg-cyan-950/30 p-4">
          <p className="text-sm font-semibold text-cyan-200">จะไปช่วยเคสนี้?</p>
          <input
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-base text-white"
            placeholder="ชื่อคุณหรือชื่อทีม"
            value={claimName}
            onChange={(e) => setClaimName(e.target.value)}
            maxLength={100}
          />
          <button type="button" disabled={busy || !claimName.trim()} onClick={claim} className={`${btn} bg-cyan-600 text-white`}>
            🚤 ฉันกำลังไป
          </button>
        </div>
      )}

      {isClaimer && (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={busy} onClick={() => resolve(tokens.claim!)} className={`${btn} bg-emerald-600 text-white`}>
            ✅ ช่วยเสร็จแล้ว
          </button>
          <button type="button" disabled={busy} onClick={release} className={`${btn} bg-slate-700 text-white`}>
            ยกเลิก ไปไม่ได้
          </button>
        </div>
      )}

      {isOwner && c.status !== 'resolved' && (
        <div className="space-y-2 rounded-2xl border border-amber-700/60 bg-amber-950/30 p-4">
          <p className="text-sm font-semibold text-amber-200">🔑 คุณเป็นผู้แจ้งเคสนี้</p>
          <button type="button" disabled={busy} onClick={() => resolve(tokens.owner!)} className={`${btn} bg-emerald-600 text-white`}>
            ✅ ได้รับความช่วยเหลือแล้ว ปิดเคส
          </button>
          <button type="button" onClick={() => setEditing((v) => !v)} className={`${btn} bg-slate-700 text-white`}>
            ✏️ แก้ไขข้อมูล
          </button>
          {editing && (
            <EditForm
              c={c}
              busy={busy}
              onSave={(patch) =>
                run(async () => {
                  const updated = await api.update(c.id, patch, tokens.owner!);
                  setEditing(false);
                  return updated;
                }, 'บันทึกแล้ว')
              }
            />
          )}
        </div>
      )}

      {message && (
        <p role="status" className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-slate-200">
          {message}
        </p>
      )}

      {!flagged && (
        <button type="button" onClick={flag} className="w-full py-3 text-xs text-slate-500 underline">
          แจ้งว่าเป็นเคสปลอม / ก่อกวน
        </button>
      )}
    </div>
  );
}

function EditForm({
  c,
  busy,
  onSave,
}: {
  c: PublicCase;
  busy: boolean;
  onSave: (patch: Pick<PublicCase, 'needs' | 'peopleCount' | 'details'>) => void;
}) {
  const [needs, setNeeds] = useState(c.needs);
  const [peopleCount, setPeopleCount] = useState(c.peopleCount);
  const [details, setDetails] = useState(c.details);
  return (
    <div className="space-y-3 pt-2">
      <NeedToggles value={needs} onChange={setNeeds} />
      <PeopleCounter value={peopleCount} onChange={setPeopleCount} />
      <textarea
        className="min-h-24 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-base text-white"
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        maxLength={1000}
      />
      <button
        type="button"
        disabled={busy || needs.length === 0}
        onClick={() => onSave({ needs, peopleCount, details })}
        className={`${btn} bg-cyan-600 text-white`}
      >
        บันทึก
      </button>
    </div>
  );
}
