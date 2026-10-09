import { useEffect, useState } from 'react';
import { CircleMarker } from 'react-leaflet';
import { Link, useParams, useSearch } from 'wouter';
import type { PublicCase, UpdateRequest } from '../../shared/schema';
import { VulnerableBadges } from '../components/CaseCard';
import { BaseMap } from '../components/map/BaseMap';
import {
  Field,
  NeedToggles,
  PeopleCounter,
  VulnerableToggles,
  fieldProps,
  inputClass,
} from '../components/RequestFields';
import { SecretLink } from '../components/SecretLink';
import { ApiError, api } from '../lib/api';
import { clearToken, getTokens, saveToken } from '../lib/caseTokens';
import { timeAgo } from '../lib/format';
import { NEED_ICON, NEED_LABEL, STATUS_COLOR, STATUS_LABEL } from '../lib/labels';
import { useCase } from '../lib/useCase';

const btn = 'min-h-12 w-full rounded-xl px-4 text-sm font-bold disabled:opacity-60';

type TokenKind = 'owner' | 'claim';

const STALE_TOKEN = 'ลิงก์นี้ใช้จัดการเคสไม่ได้แล้ว (อาจมีคนอื่นรับเคสแทน)';

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const search = useSearch();
  const { data, setData, state, online } = useCase(id);
  const [tokens, setTokens] = useState(() => getTokens(id));
  const [phone, setPhone] = useState<string | null | undefined>(undefined);
  const [claimName, setClaimName] = useState('');
  const [claimLink, setClaimLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState(false);

  // An owner link (?t=...) or claim link (?c=...) stores the token on this device,
  // then the token is removed from the address bar
  useEffect(() => {
    const params = new URLSearchParams(search);
    const owner = params.get('t');
    const claim = params.get('c');
    if (!owner && !claim) return;
    if (owner) saveToken(id, 'owner', owner);
    if (claim) saveToken(id, 'claim', claim);
    setTokens(getTokens(id));
    window.history.replaceState(null, '', `/r/${id}`);
  }, [id, search]);

  const offlineBanner = !online && (
    <div role="status" className="rounded-lg border border-amber-700/60 bg-amber-950/60 px-3 py-2 text-xs text-amber-200">
      ออฟไลน์ ข้อมูลอาจไม่อัปเดต กำลังเชื่อมต่อใหม่...
    </div>
  );

  if (state === 'loading')
    return (
      <div className="space-y-3">
        {offlineBanner}
        <p className="text-slate-400">กำลังโหลด...</p>
      </div>
    );
  if (state === 'notfound' || (state === 'ready' && !data))
    return (
      <div className="space-y-3">
        <p className="text-slate-300">ไม่พบเคสนี้ อาจถูกซ่อนเพราะถูกแจ้งว่าเป็นเคสปลอม</p>
        <Link href="/" className="text-cyan-400 underline">กลับหน้าหลัก</Link>
      </div>
    );
  if (state === 'error' || !data)
    return (
      <div className="space-y-3">
        {offlineBanner}
        <p className="text-red-300">โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่</p>
      </div>
    );

  const c = data;
  /**
   * Runs an action with busy/message handling. `tokenKind` names the stored token the action used:
   * a 403 means that token no longer works here (e.g. the claim expired and someone else claimed),
   * so it is forgotten on this device.
   */
  const run = async (
    action: () => Promise<PublicCase | void>,
    { done, tokenKind }: { done?: string; tokenKind?: TokenKind } = {}
  ) => {
    setBusy(true);
    setMessage(null);
    try {
      const updated = await action();
      if (updated) setData(updated);
      if (done) setMessage(done);
    } catch (e) {
      if (e instanceof ApiError && e.status === 403 && tokenKind) {
        clearToken(c.id, tokenKind);
        setTokens(getTokens(c.id));
        if (tokenKind === 'claim') setClaimLink(null);
        if (tokenKind === 'owner') setEditing(false);
        setMessage(STALE_TOKEN);
      } else {
        setMessage(e instanceof ApiError ? e.message : 'เกิดข้อผิดพลาด');
      }
    } finally {
      setBusy(false);
    }
  };

  const claim = () =>
    run(
      async () => {
        const { claimToken } = await api.claim(c.id, claimName);
        saveToken(c.id, 'claim', claimToken);
        setTokens(getTokens(c.id));
        setClaimLink(`${window.location.origin}/r/${c.id}?c=${claimToken}`);
        // The claim succeeded and the token is saved; if this refresh fails, SSE or a reload catches up
        return api.get(c.id).catch(() => undefined);
      },
      { done: 'รับเคสแล้ว เมื่อช่วยเสร็จอย่าลืมกด "ช่วยเสร็จแล้ว"' }
    );

  const release = () =>
    run(
      async () => {
        const updated = await api.release(c.id, tokens.claim!);
        clearToken(c.id, 'claim');
        setTokens(getTokens(c.id));
        setClaimLink(null);
        return updated;
      },
      { tokenKind: 'claim' }
    );

  const resolve = (kind: TokenKind) =>
    run(() => api.resolve(c.id, tokens[kind]!), { done: 'ปิดเคสแล้ว ขอบคุณที่ช่วยกัน', tokenKind: kind });

  const save = (patch: Partial<UpdateRequest>) =>
    run(
      async () => {
        setEditErrors({});
        try {
          const updated = await api.update(c.id, patch, tokens.owner!);
          setEditing(false);
          return updated;
        } catch (e) {
          if (e instanceof ApiError) setEditErrors(e.fields);
          throw e;
        }
      },
      { done: 'บันทึกแล้ว', tokenKind: 'owner' }
    );

  const flag = () => {
    if (!window.confirm('แจ้งว่าเคสนี้เป็นเคสปลอมหรือก่อกวน?')) return;
    run(
      async () => {
        await api.flag(c.id);
        setFlagged(true);
      },
      { done: 'ขอบคุณที่แจ้ง' }
    );
  };

  const isClaimer = !!tokens.claim && c.status === 'claimed';
  const isOwner = !!tokens.owner;
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {offlineBanner}
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
            onClick={() => run(async () => setPhone((await api.revealPhone(c.id, tokens.owner ?? tokens.claim)).phone))}
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
          <label htmlFor="claim-name" className="block text-sm font-semibold text-cyan-200">
            จะไปช่วยเคสนี้?
          </label>
          <input
            id="claim-name"
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

      {isClaimer && claimLink && (
        <SecretLink
          link={claimLink}
          title="🔑 เก็บลิงก์รับเคสนี้ไว้ (แคปหน้าจอได้)"
          note='ใช้ลิงก์นี้เพื่อกด "ช่วยเสร็จแล้ว" หรือ "ยกเลิก" จากเครื่องอื่นได้ ห้ามส่งให้คนอื่น'
          shareTitle="ลิงก์รับเคสช่วยเหลือ"
        />
      )}

      {isClaimer && (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={busy} onClick={() => resolve('claim')} className={`${btn} bg-emerald-600 text-white`}>
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
          <button type="button" disabled={busy} onClick={() => resolve('owner')} className={`${btn} bg-emerald-600 text-white`}>
            ✅ ได้รับความช่วยเหลือแล้ว ปิดเคส
          </button>
          <button
            type="button"
            aria-expanded={editing}
            onClick={() => {
              setEditing((v) => !v);
              setEditErrors({});
            }}
            className={`${btn} bg-slate-700 text-white`}
          >
            ✏️ แก้ไขข้อมูล
          </button>
          {editing && <EditForm c={c} busy={busy} errors={editErrors} onSave={save} />}
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
  errors,
  onSave,
}: {
  c: PublicCase;
  busy: boolean;
  errors: Record<string, string>;
  onSave: (patch: Partial<UpdateRequest>) => void;
}) {
  const [needs, setNeeds] = useState(c.needs);
  const [peopleCount, setPeopleCount] = useState(c.peopleCount);
  const [vulnerable, setVulnerable] = useState({
    hasElderly: c.hasElderly,
    hasChildren: c.hasChildren,
    hasBedridden: c.hasBedridden,
  });
  const [locationText, setLocationText] = useState(c.locationText);
  const [phone, setPhone] = useState('');
  const [details, setDetails] = useState(c.details);

  const submit = () =>
    onSave({
      needs,
      peopleCount,
      ...vulnerable,
      locationText,
      details,
      // An empty phone field keeps the current number
      ...(phone.trim() ? { phone } : {}),
    });

  return (
    <div className="space-y-4 pt-2">
      <Field id="edit-needs" group label="ต้องการความช่วยเหลืออะไร" error={errors.needs}>
        <NeedToggles value={needs} onChange={setNeeds} />
      </Field>
      <Field id="edit-peopleCount" label="มีกี่คน" error={errors.peopleCount}>
        <PeopleCounter
          value={peopleCount}
          onChange={setPeopleCount}
          inputProps={fieldProps('edit-peopleCount', errors.peopleCount)}
        />
      </Field>
      <Field id="edit-vulnerable" group label="มีกลุ่มเปราะบางไหม">
        <VulnerableToggles value={vulnerable} onChange={setVulnerable} />
      </Field>
      <Field id="edit-locationText" label="จุดสังเกต" error={errors.locationText}>
        <input
          {...fieldProps('edit-locationText', errors.locationText)}
          className={inputClass}
          value={locationText}
          onChange={(e) => setLocationText(e.target.value)}
          maxLength={200}
        />
      </Field>
      <Field id="edit-phone" label="เบอร์โทรใหม่ (เว้นว่างถ้าไม่เปลี่ยน)" error={errors.phone}>
        <input
          {...fieldProps('edit-phone', errors.phone)}
          className={inputClass}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="081-234-5678"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </Field>
      <Field id="edit-details" label="รายละเอียดเพิ่มเติม" error={errors.details}>
        <textarea
          {...fieldProps('edit-details', errors.details)}
          className={`${inputClass} min-h-24`}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          maxLength={1000}
        />
      </Field>
      <button
        type="button"
        disabled={busy || needs.length === 0}
        onClick={submit}
        className={`${btn} bg-cyan-600 text-white`}
      >
        บันทึก
      </button>
    </div>
  );
}
