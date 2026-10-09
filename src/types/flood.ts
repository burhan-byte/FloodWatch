export type SeverityLevel = 'critical' | 'warning' | 'watch' | 'normal';

export interface GaugingStation {
  id: string;
  code: string;
  name: string;
  riverName: string;
  province: string;
  basin: string;
  lat: number;
  lng: number;
  currentLevelM: number; // ระดับน้ำปัจจุบัน (ม.รทก.)
  bankLevelM: number;    // ระดับตลิ่ง (ม.รทก.)
  riverBedLevelM: number; // ระดับท้องน้ำ (ม.รทก.)
  warningLevelM: number; // ระดับเตือนภัย (ม.รทก.)
  capacityPercent: number; // % เทียบความจุลำน้ำ
  flowRateM3s: number;   // อัตราการไหล (ลบ.ม./วินาที)
  trend: 'rising' | 'steady' | 'falling';
  status: SeverityLevel;
  waterDepthDiffM: number; // +สูงกว่าตลิ่ง หรือ -ต่ำกว่าตลิ่ง
  history24h: { time: string; level: number; flow: number }[];
  forecast6h: number;
  lastUpdated: string;
}

export interface FloodAlertZone {
  id: string;
  province: string;
  district: string;
  subdistricts: string[];
  basin: string;
  riskLevel: 'critical' | 'warning' | 'watch';
  alertType: 'flash_flood' | 'river_overflow' | 'urban_drainage' | 'dam_release';
  waterDepthCm: number;
  waterDepthText: string;
  affectedHouseholds: number;
  issuedAt: string;
  validUntil: string;
  description: string;
  evacuationRecommended: boolean;
  roadPassable: boolean;
  lat: number;
  lng: number;
}

export interface DamStatus {
  id: string;
  name: string;
  province: string;
  basin: string;
  maxCapacityMcm: number;     // ความจุสูงสุด ล้าน ลบ.ม.
  currentStorageMcm: number;  // ปริมาตรน้ำปัจจุบัน ล้าน ลบ.ม.
  percentCapacity: number;
  inflowMcmDay: number;       // ปริมาณน้ำไหลเข้า (ล้าน ลบ.ม./วัน)
  outflowMcmDay: number;      // ปริมาณน้ำระบาย (ล้าน ลบ.ม./วัน)
  status: SeverityLevel;
  lat: number;
  lng: number;
}

export interface EvacuationShelter {
  id: string;
  name: string;
  province: string;
  district: string;
  address: string;
  capacityPeople: number;
  currentOccupants: number;
  contactPhone: string;
  suppliesStatus: 'sufficient' | 'needs_water' | 'needs_food' | 'needs_medicine';
  facilities: string[];
  lat: number;
  lng: number;
  isOpen: boolean;
}

export interface CitizenReport {
  id: string;
  timestamp: string;
  reporterName: string;
  locationName: string;
  province: string;
  waterLevelCm: number;
  roadStatus: 'passable' | 'only_high_vehicles' | 'impassable';
  description: string;
  photoUrl?: string;
  upvotes: number;
  verified: boolean;
}
