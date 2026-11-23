export type PageId = 'dashboard' | 'bookings' | 'catalog' | 'reports' | 'audit';

export type BookingStatus =
  | 'SOLICITADA'
  | 'APROBADA'
  | 'EN_PREPARACION'
  | 'EN_USO'
  | 'DEVUELTA'
  | 'CANCELADA';

export type EventType =
  | 'CREADA'
  | 'APROBADA'
  | 'EN_PREPARACION'
  | 'EN_USO'
  | 'DEVUELTA'
  | 'CANCELADA'
  | 'MODIFICADA';

export type CatalogTab = 'labs' | 'equipment' | 'supplies';

export type Role = 'ADMIN' | 'TECNICO' | 'ESTUDIANTE' | 'AUDITOR';

export interface AppUser {
  name: string;
  email: string;
  avatar: string;
  role: string;
  roles: Role[];
}

export interface Booking {
  id: number;
  resourceId: number;
  resourceNombre: string | null;
  studentEmail: string;
  purpose: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Lab {
  id: number;
  name: string;
  location: string | null;
  capacity: number;
  createdAt: string;
}

export type ResourceType = 'SALA' | 'EQUIPO' | 'INSUMO';
export type ResourceStatus = 'DISPONIBLE' | 'EN_USO' | 'MANTENIMIENTO' | 'BAJA';

export interface CatalogResource {
  id: number;
  labId: number;
  labName: string | null;
  categoryId: number;
  categoryName: string | null;
  name: string;
  resourceType: ResourceType;
  status: ResourceStatus;
  quantityTotal: number | null;
  quantityAvailable: number | null;
  reorderThreshold: number | null;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  unitOfMeasure: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
}

export interface LabRequest {
  name: string;
  location?: string;
  capacity: number;
}

export interface CreateResourceRequest {
  labId: number;
  categoryId: number;
  name: string;
  resourceType: ResourceType;
  status?: ResourceStatus;
  quantityTotal?: number;
  reorderThreshold?: number;
  unitOfMeasure?: string;
  equipment?: {
    brand?: string;
    model?: string;
    serialNumber?: string;
  };
}

export interface StockAdjustRequest {
  delta: number;
  referenceBookingId?: number;
  note?: string;
}

export interface AuditEvent {
  id: string;
  reservaId: string;
  tipo: EventType;
  usuario: string;
  rol: string;
  lab: string;
  timestamp: string;
  ip: string;
  traceId: string;
  detalle: string;
}

export interface CreateBookingRequest {
  resourceId: number;
  purpose: string;
  startTime: string;
  endTime: string;
  studentEmail?: string;
}

export interface UpdateBookingStatusRequest {
  status: BookingStatus;
}

export interface UsageByHour {
  h: string;
  impresoras: number;
  microscopios: number;
  pcs: number;
  labs: number;
}

export interface EquipmentStatusSummary {
  name: string;
  ocupado: number;
  disponible: number;
  mantenimiento: number;
}

export interface BookingHourlyMetric {
  labId: number;
  bucketHour: string;
  bookingsCount: number;
  avgCycleMinutes: number | null;
}

export interface ResourceUsageMetric {
  resourceId: number;
  periodStart: string;
  periodEnd: string;
  usageCount: number;
  totalDurationMinutes: number | null;
}

export type DlqHealth = 'OK' | 'ALERT' | 'UNAVAILABLE';

export interface DlqQueueStatus {
  label: string;
  queue: string;
  dlq: string;
  pending: number;
  failed: number;
}

export interface DlqStatus {
  status: DlqHealth;
  totalInDlq: number;
  queues: DlqQueueStatus[];
  checkedAt: string;
}

export interface StatusDistribution {
  name: string;
  value: number;
  color: string;
}

export interface WorkflowStep {
  id: string;
  label: string;
  desc: string;
  active: boolean;
  done: boolean;
}

export const STATUS_LABELS: Record<BookingStatus, string> = {
  SOLICITADA: 'Solicitada',
  APROBADA: 'Aprobada',
  EN_PREPARACION: 'En Preparación',
  EN_USO: 'En Uso',
  DEVUELTA: 'Devuelta',
  CANCELADA: 'Cancelada',
};

export const STATUS_CLASSES: Record<BookingStatus, string> = {
  SOLICITADA: 'status-solicitada',
  APROBADA: 'status-aprobada',
  EN_PREPARACION: 'status-en_preparacion',
  EN_USO: 'status-en_uso',
  DEVUELTA: 'status-devuelta',
  CANCELADA: 'status-cancelada',
};

export const STATUS_COLORS: Record<BookingStatus, string> = {
  SOLICITADA: '#fbbf24',
  APROBADA: '#5cb85c',
  EN_PREPARACION: '#60a5fa',
  EN_USO: '#38bdf8',
  DEVUELTA: '#9ca3af',
  CANCELADA: '#f87171',
};

export const ALL_STATUSES: BookingStatus[] = [
  'SOLICITADA',
  'APROBADA',
  'EN_PREPARACION',
  'EN_USO',
  'DEVUELTA',
  'CANCELADA',
];

export const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  SOLICITADA: ['APROBADA', 'CANCELADA'],
  APROBADA: ['EN_PREPARACION', 'CANCELADA'],
  EN_PREPARACION: ['EN_USO', 'CANCELADA'],
  EN_USO: ['DEVUELTA'],
  DEVUELTA: [],
  CANCELADA: [],
};

export const RESOURCE_STATUS_LABELS: Record<ResourceStatus, string> = {
  DISPONIBLE: 'Disponible',
  EN_USO: 'En Uso',
  MANTENIMIENTO: 'Mantenimiento',
  BAJA: 'De baja',
};

export const RESOURCE_STATUS_CLASSES: Record<ResourceStatus, string> = {
  DISPONIBLE: 'bg-green-100 text-green-700',
  EN_USO: 'bg-blue-100 text-blue-700',
  MANTENIMIENTO: 'bg-orange-100 text-orange-700',
  BAJA: 'bg-gray-200 text-gray-600',
};
