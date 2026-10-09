import type { Need, Status } from '../../shared/schema';

export const NEED_LABEL: Record<Need, string> = {
  evacuate: 'อพยพ / ต้องการเรือ',
  food: 'อาหาร / น้ำดื่ม',
  medical: 'ยา / การแพทย์',
  animals: 'สัตว์เลี้ยง / ปศุสัตว์',
};

export const NEED_ICON: Record<Need, string> = {
  evacuate: '🚤',
  food: '🍚',
  medical: '💊',
  animals: '🐾',
};

export const STATUS_LABEL: Record<Status, string> = {
  open: 'รอความช่วยเหลือ',
  claimed: 'มีคนกำลังไป',
  resolved: 'ช่วยเหลือแล้ว',
};

export const STATUS_COLOR: Record<Status, string> = {
  open: '#ef4444',
  claimed: '#eab308',
  resolved: '#10b981',
};

export const HOTLINES = [
  { number: '1784', label: 'ปภ.' },
  { number: '1669', label: 'การแพทย์ฉุกเฉิน' },
  { number: '1460', label: 'กรมชลประทาน' },
] as const;
