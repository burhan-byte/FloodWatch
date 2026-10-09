import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'wouter';
import type { Need } from '../../shared/schema';
import { LocationPicker } from '../components/LocationPicker';
import { NeedToggles, PeopleCounter, VulnerableToggles, type Vulnerable } from '../components/RequestFields';
import { ApiError, api } from '../lib/api';
import { saveToken } from '../lib/caseTokens';
import type { LatLng } from '../lib/geo';

const DRAFT_KEY = 'floodwatch.draft';

interface Draft {
  location: LatLng | null;
  needs: Need[];
  peopleCount: number;
  vulnerable: Vulnerable;
  phone: string;
  contactName: string;
  locationText: string;
  details: string;
}

const EMPTY: Draft = {
  location: null,
  needs: [],
  peopleCount: 1,
  vulnerable: { hasElderly: false, hasChildren: false, hasBedridden: false },
  phone: '',
  contactName: '',
  locationText: '',
  details: '',
};

function loadDraft(): Draft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

function storeDraft(draft: Draft | null) {
  try {
    if (draft) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    else localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

function Field({ label, error, children }: { label: ReactNode; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-sm font-semibold text-slate-200">{label}</div>
      {children}
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}

const input = 'w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-base text-white placeholder-slate-500';

export default function NewRequest() {
  const [d, setD] = useState<Draft>(loadDraft);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [created, setCreated] = useState<{ id: string; ownerToken: string } | null>(null);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setD((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [created]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFields({});
    setError(null);
    if (!d.location) return setFields({ lat: 'กรุณาระบุตำแหน่ง' });
    setSending(true);
    try {
      const res = await api.create({
        lat: d.location.lat,
        lng: d.location.lng,
        needs: d.needs,
        peopleCount: d.peopleCount,
        ...d.vulnerable,
        phone: d.phone,
        contactName: d.contactName,
        locationText: d.locationText,
        details: d.details,
      });
      saveToken(res.id, 'owner', res.ownerToken);
      storeDraft(null);
      setCreated(res);
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : new ApiError(0, 'ส่งไม่สำเร็จ');
      setFields(apiErr.fields);
      if (apiErr.status === 400) setError('กรุณาตรวจสอบข้อมูลที่ทำเครื่องหมายไว้');
      else {
        storeDraft(d); // keep what they typed for the retry
        setError(`${apiErr.message} ข้อมูลที่กรอกถูกเก็บไว้แล้ว กด "ส่งคำขอ" เพื่อลองอีกครั้ง`);
      }
    } finally {
      setSending(false);
    }
  };

  if (created) return <Created {...created} />;

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-5" noValidate>
      <h1 className="text-xl font-bold text-white">🆘 ขอความช่วยเหลือ</h1>

      <Field label={<>ตำแหน่งของคุณ <span className="text-red-400">*</span></>} error={fields.lat ?? fields.lng}>
        <LocationPicker value={d.location} onChange={(p) => set('location', p)} />
        <input
          className={input}
          placeholder="จุดสังเกต เช่น ซอย 5 หลังวัด บ้านสีฟ้า"
          value={d.locationText}
          onChange={(e) => set('locationText', e.target.value)}
          maxLength={200}
        />
      </Field>

      <Field label={<>ต้องการความช่วยเหลืออะไร <span className="text-red-400">*</span></>} error={fields.needs}>
        <NeedToggles value={d.needs} onChange={(v) => set('needs', v)} />
      </Field>

      <Field label="มีกี่คน" error={fields.peopleCount}>
        <PeopleCounter value={d.peopleCount} onChange={(v) => set('peopleCount', v)} />
      </Field>

      <Field label="มีกลุ่มเปราะบางไหม (ถ้ามี)">
        <VulnerableToggles value={d.vulnerable} onChange={(v) => set('vulnerable', v)} />
      </Field>

      <Field label={<>เบอร์โทรติดต่อ <span className="text-red-400">*</span></>} error={fields.phone}>
        <input
          className={input}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="081-234-5678"
          value={d.phone}
          onChange={(e) => set('phone', e.target.value)}
        />
        <p className="text-xs text-slate-500">เบอร์จะแสดงเมื่ออาสากด "แสดงเบอร์" เท่านั้น</p>
      </Field>

      <Field label="ชื่อ (ไม่บังคับ)" error={fields.contactName}>
        <input className={input} value={d.contactName} onChange={(e) => set('contactName', e.target.value)} maxLength={100} />
      </Field>

      <Field label="รายละเอียดเพิ่มเติม (ไม่บังคับ)" error={fields.details}>
        <textarea
          className={`${input} min-h-24`}
          placeholder="เช่น น้ำสูงระดับเอว มีผู้ป่วยต้องใช้ออกซิเจน"
          value={d.details}
          onChange={(e) => set('details', e.target.value)}
          maxLength={1000}
        />
      </Field>

      {error && (
        <p role="alert" className="rounded-xl border border-red-700/60 bg-red-950/60 p-3 text-sm text-red-200">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={sending}
        className="min-h-14 w-full rounded-xl bg-red-600 text-lg font-bold text-white shadow-lg hover:bg-red-500 disabled:opacity-60"
      >
        {sending ? 'กำลังส่ง...' : 'ส่งคำขอความช่วยเหลือ'}
      </button>
    </form>
  );
}

function Created({ id, ownerToken }: { id: string; ownerToken: string }) {
  const link = `${window.location.origin}/r/${id}?t=${ownerToken}`;
  const [copied, setCopied] = useState(false);
  const copy = () =>
    navigator.clipboard
      ?.writeText(link)
      .then(() => setCopied(true))
      .catch(() => undefined);
  const share = () => navigator.share?.({ title: 'ลิงก์จัดการคำขอความช่วยเหลือ', url: link }).catch(() => undefined);

  return (
    <div className="mx-auto max-w-xl space-y-4 text-center">
      <div className="text-5xl">✅</div>
      <h1 className="text-xl font-bold text-white">ส่งคำขอแล้ว อาสาในพื้นที่จะเห็นทันที</h1>
      <p className="text-sm text-slate-300">
        ถ้าเป็นกรณีอันตรายถึงชีวิต โทร <a href="tel:1669" className="font-bold underline">1669</a> หรือ{' '}
        <a href="tel:1784" className="font-bold underline">1784</a> ด้วย
      </p>
      <div className="space-y-2 rounded-2xl border border-amber-600/60 bg-amber-950/40 p-4 text-left">
        <p className="text-sm font-bold text-amber-200">🔑 เก็บลิงก์นี้ไว้ (แคปหน้าจอได้)</p>
        <p className="text-xs text-amber-100/80">ใช้ลิงก์นี้เพื่อแก้ไขข้อมูล หรือแจ้งว่าได้รับความช่วยเหลือแล้ว ห้ามส่งให้คนอื่น</p>
        <p className="break-all rounded-lg bg-slate-950 p-2 font-mono text-xs text-slate-200">{link}</p>
        <div className="flex gap-2">
          <button type="button" onClick={copy} className="flex-1 rounded-lg bg-slate-800 py-2 text-sm font-semibold text-white">
            {copied ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์'}
          </button>
          {'share' in navigator && (
            <button type="button" onClick={share} className="flex-1 rounded-lg bg-slate-800 py-2 text-sm font-semibold text-white">
              แชร์
            </button>
          )}
        </div>
      </div>
      <Link href={`/r/${id}`} className="block rounded-xl bg-cyan-600 py-3 font-bold text-white">
        ดูเคสของฉัน
      </Link>
    </div>
  );
}
