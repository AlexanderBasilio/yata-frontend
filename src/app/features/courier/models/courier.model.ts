export type CourierServiceType = 'PACKAGE' | 'PURCHASE_PICKUP' | 'FRESH_FOOD' | 'OTHER';

export type CourierPackageSize = 'SMALL' | 'MEDIUM' | 'LARGE';

export interface CourierLocation {
  address: string;
  reference: string;
  latitude: number | null;
  longitude: number | null;
  isConfirmedOnMap: boolean;
  placeName?: string;
  isManualFallback?: boolean;
}

export interface CourierPackageSpecs {
  size: CourierPackageSize;
  quantity: number;
  approxWeightKg: number | null;
  hasCustomDimensions: boolean;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  isFragile: boolean;
  fragilityDetail: string;
  canLeak: boolean;
  needsRefrigeration: boolean;
  hasAdequateContainer: boolean;
  isPurchaseAlreadyPaid: boolean;
  purchaseCoordinationNotes: string;
  description: string;
}

export interface CourierContacts {
  senderName: string;
  senderPhone: string;
  recipientName: string;
  recipientPhone: string;
  notes: string;
}

export interface CourierSchedule {
  date: string; // Formato YYYY-MM-DD
  dateLabel: string;
  window: string; // '10:00 a. m. a 12:00 p. m.'
  isLateBooking: boolean; // Si es posterior a las 9:45 a. m. para la ruta de hoy
  cutoffTimeNoticeAcknowledged: boolean;
}

export interface CourierQuoteFormState {
  serviceType: CourierServiceType;
  serviceTypeDetail?: string;
  pickup: CourierLocation;
  delivery: CourierLocation;
  packageSpecs: CourierPackageSpecs;
  contacts: CourierContacts;
  schedule: CourierSchedule;
}
