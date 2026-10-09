import { z } from 'zod';

export const NEEDS = ['evacuate', 'food', 'medical', 'animals'] as const;
export type Need = (typeof NEEDS)[number];

export const STATUSES = ['open', 'claimed', 'resolved'] as const;
export type Status = (typeof STATUSES)[number];

export const TH_BOUNDS = { minLat: 5.5, maxLat: 20.6, minLng: 97.3, maxLng: 105.7 } as const;

const OUTSIDE_TH = 'ตำแหน่งต้องอยู่ในประเทศไทย';

const lat = z
  .number({ error: 'กรุณาระบุตำแหน่ง' })
  .min(TH_BOUNDS.minLat, OUTSIDE_TH)
  .max(TH_BOUNDS.maxLat, OUTSIDE_TH);

const lng = z
  .number({ error: 'กรุณาระบุตำแหน่ง' })
  .min(TH_BOUNDS.minLng, OUTSIDE_TH)
  .max(TH_BOUNDS.maxLng, OUTSIDE_TH);

// Fields shared by create and update; no defaults here so PATCH only touches sent keys
const fields = {
  locationText: z.string({ error: 'ค่าไม่ถูกต้อง' }).trim().max(200, 'ที่อยู่ยาวเกิน 200 ตัวอักษร'),
  needs: z
    .array(z.enum(NEEDS, { error: 'ประเภทความช่วยเหลือไม่ถูกต้อง' }), { error: 'เลือกประเภทความช่วยเหลือ' })
    .min(1, 'เลือกประเภทความช่วยเหลืออย่างน้อย 1 อย่าง')
    .transform((needs) => [...new Set(needs)]),
  peopleCount: z
    .number({ error: 'ระบุจำนวนคน' })
    .int('จำนวนคนต้องเป็นจำนวนเต็ม')
    .min(1, 'อย่างน้อย 1 คน')
    .max(500, 'ไม่เกิน 500 คน'),
  hasElderly: z.boolean({ error: 'ค่าไม่ถูกต้อง' }),
  hasChildren: z.boolean({ error: 'ค่าไม่ถูกต้อง' }),
  hasBedridden: z.boolean({ error: 'ค่าไม่ถูกต้อง' }),
  contactName: z.string({ error: 'ค่าไม่ถูกต้อง' }).trim().max(100, 'ชื่อยาวเกิน 100 ตัวอักษร'),
  phone: z
    .string({ error: 'กรุณาใส่เบอร์โทร' })
    .trim()
    .transform((s) => s.replace(/[\s-]/g, ''))
    .refine((s) => /^0\d{8,9}$/.test(s), 'เบอร์โทรไม่ถูกต้อง (ตัวอย่าง 081-234-5678)'),
  details: z.string({ error: 'ค่าไม่ถูกต้อง' }).trim().max(1000, 'รายละเอียดยาวเกิน 1000 ตัวอักษร'),
};

export const createRequestSchema = z.object({
  lat,
  lng,
  needs: fields.needs,
  phone: fields.phone,
  locationText: fields.locationText.default(''),
  peopleCount: fields.peopleCount.default(1),
  hasElderly: fields.hasElderly.default(false),
  hasChildren: fields.hasChildren.default(false),
  hasBedridden: fields.hasBedridden.default(false),
  contactName: fields.contactName.default(''),
  details: fields.details.default(''),
}, { error: 'ข้อมูลไม่ถูกต้อง' });

export const updateRequestSchema = z.object(fields, { error: 'ข้อมูลไม่ถูกต้อง' }).partial();

export const claimSchema = z.object({
  name: z
    .string({ error: 'กรุณาใส่ชื่อ' })
    .trim()
    .min(1, 'กรุณาใส่ชื่อหรือชื่อทีม')
    .max(100, 'ชื่อยาวเกิน 100 ตัวอักษร'),
}, { error: 'ข้อมูลไม่ถูกต้อง' });

export type CreateRequestInput = z.input<typeof createRequestSchema>;
export type CreateRequest = z.output<typeof createRequestSchema>;
export type UpdateRequest = z.output<typeof updateRequestSchema>;

/** A help request as anyone may see it. Never contains the phone number. */
export interface PublicCase {
  id: string;
  lat: number;
  lng: number;
  locationText: string;
  needs: Need[];
  peopleCount: number;
  hasElderly: boolean;
  hasChildren: boolean;
  hasBedridden: boolean;
  contactName: string;
  details: string;
  status: Status;
  claimedBy: string | null;
  claimedAt: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}
