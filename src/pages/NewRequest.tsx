import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'wouter';
import type { Need } from '../../shared/schema';
import { LocationPicker } from '../components/LocationPicker';
import {
  Field,
  NeedToggles,
  PeopleCounter,
  VulnerableToggles,
  fieldProps,
  inputClass as input,
  type Vulnerable,
} from '../components/RequestFields';
import { SecretLink } from '../components/SecretLink';
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

      <Field id="location" group label={<>ตำแหน่งของคุณ <span className="text-red-400">*</span></>} error={fields.lat ?? fields.lng}>
        <LocationPicker value={d.location} onChange={(p) => set('location', p)} />
        <input
          {...fieldProps('locationText', fields.locationText)}
          aria-label="จุดสังเกต"
          className={input}
          placeholder="จุดสังเกต เช่น ซอย 5 หลังวัด บ้านสีฟ้า"
          value={d.locationText}
          onChange={(e) => set('locationText', e.target.value)}
          maxLength={200}
        />
        {fields.locationText && (
          <p id="locationText-err" className="text-xs text-red-300">
            {fields.locationText}
          </p>
        )}
      </Field>

      <Field id="needs" group label={<>ต้องการความช่วยเหลืออะไร <span className="text-red-400">*</span></>} error={fields.needs}>
        <NeedToggles value={d.needs} onChange={(v) => set('needs', v)} />
      </Field>

      <Field id="peopleCount" label="มีกี่คน" error={fields.peopleCount}>
        <PeopleCounter
          value={d.peopleCount}
          onChange={(v) => set('peopleCount', v)}
          inputProps={fieldProps('peopleCount', fields.peopleCount)}
        />
      </Field>

      <Field id="vulnerable" group label="มีกลุ่มเปราะบางไหม (ถ้ามี)">
        <VulnerableToggles value={d.vulnerable} onChange={(v) => set('vulnerable', v)} />
      </Field>

      <Field id="phone" label={<>เบอร์โทรติดต่อ <span className="text-red-400">*</span></>} error={fields.phone}>
        <input
          {...fieldProps('phone', fields.phone)}
          required
          aria-required="true"
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

      <Field id="contactName" label="ชื่อ (ไม่บังคับ)" error={fields.contactName}>
        <input {...fieldProps('contactName', fields.contactName)} className={input} value={d.contactName} onChange={(e) => set('contactName', e.target.value)} maxLength={100} />
      </Field>

      <Field id="details" label="รายละเอียดเพิ่มเติม (ไม่บังคับ)" error={fields.details}>
        <textarea
          {...fieldProps('details', fields.details)}
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

  return (
    <div className="mx-auto max-w-xl space-y-4 text-center">
      <div className="text-5xl">✅</div>
      <h1 className="text-xl font-bold text-white">ส่งคำขอแล้ว อาสาในพื้นที่จะเห็นทันที</h1>
      <p className="text-sm text-slate-300">
        ถ้าเป็นกรณีอันตรายถึงชีวิต โทร <a href="tel:1669" className="font-bold underline">1669</a> หรือ{' '}
        <a href="tel:1784" className="font-bold underline">1784</a> ด้วย
      </p>
      <SecretLink
        link={link}
        title="🔑 เก็บลิงก์นี้ไว้ (แคปหน้าจอได้)"
        note="ใช้ลิงก์นี้เพื่อแก้ไขข้อมูล หรือแจ้งว่าได้รับความช่วยเหลือแล้ว ห้ามส่งให้คนอื่น"
        shareTitle="ลิงก์จัดการคำขอความช่วยเหลือ"
      />
      <Link href={`/r/${id}`} className="block rounded-xl bg-cyan-600 py-3 font-bold text-white">
        ดูเคสของฉัน
      </Link>
    </div>
  );
}
