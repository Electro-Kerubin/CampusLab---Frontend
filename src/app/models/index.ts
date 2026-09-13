// Tipos compartidos de la aplicación CampusLab

export type PageId = 'dashboard' | 'bookings' | 'catalog' | 'reports' | 'audit';

export type BookingStatus =
  | 'SOLICITADA'
  | 'APROBADA'
  | 'EN_PREPARACIÓN'
  | 'EN_USO'
  | 'DEVUELTA'
  | 'CANCELADA';

export type EventType =
  | 'CREADA'
  | 'APROBADA'
  | 'EN_PREPARACIÓN'
  | 'EN_USO'
  | 'DEVUELTA'
  | 'CANCELADA'
  | 'MODIFICADA';

export type CatalogTab = 'labs' | 'equipment' | 'supplies';

export interface AppUser {
  name: string;
  email: string;
  avatar: string;
  role: string; // Informativo - proviene del token de Azure AD, no se elige en login
}

export interface Booking {
  id: string;
  lab: string;
  equipment: string;
  requester: string;
  role: string;
  date: string;
  time: string;
  status: BookingStatus;
}

export interface Lab {
  id: string;
  name: string;
  type: string;
  capacity: number;
  available: number;
  total: number;
  location: string;
  status: 'Disponible' | 'Ocupado' | 'Parcial' | 'En Mantenimiento';
}

export interface Equipment {
  id: string;
  name: string;
  lab: string;
  stock: number;
  total: number;
  status: 'Disponible' | 'En Uso' | 'Parcial' | 'Mantenimiento';
}

export interface Supply {
  id: string;
  name: string;
  unit: string;
  stock: number;
  minStock: number;
  lab: string;
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

// ─── Contratos REST con el backend Spring Boot ─────────────────────────

/** POST /api/bookings */
export interface CreateBookingRequest {
  lab: string;
  equipment: string;
  date: string;
  time: string;
  purpose?: string;
  requester?: string;
}

/** PUT /api/bookings/{id}/status */
export interface UpdateBookingStatusRequest {
  status: BookingStatus;
}

/** GET /api/report/usage-by-hour */
export interface UsageByHour {
  h: string;
  impresoras: number;
  microscopios: number;
  pcs: number;
  labs: number;
}

/** GET /api/report/equipment-status */
export interface EquipmentStatusSummary {
  name: string;
  ocupado: number;
  disponible: number;
  mantenimiento: number;
}

/** GET /api/report/bookings-by-hour */
export interface BookingsByHour {
  h: string;
  reservas: number;
  canceladas: number;
}

/** GET /api/report/top-resources */
export interface TopResource {
  name: string;
  usos: number;
}

/** GET /api/report/status-distribution */
export interface StatusDistribution {
  name: string;
  value: number;
  color: string;
}

/** GET /api/report/cycle-time */
export interface CycleTimePoint {
  semana: string;
  ciclo: number;
}

/** GET /api/report/kpis */
export interface ReportKpis {
  totalReservas: number;
  tasaAprobacion: number;
  tiempoCicloPromedio: number;
  tasaCancelacion: number;
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
  'EN_PREPARACIÓN': 'En Preparación',
  EN_USO: 'En Uso',
  DEVUELTA: 'Devuelta',
  CANCELADA: 'Cancelada',
};

export const STATUS_CLASSES: Record<BookingStatus, string> = {
  SOLICITADA: 'status-solicitada',
  APROBADA: 'status-aprobada',
  'EN_PREPARACIÓN': 'status-en_preparacion',
  EN_USO: 'status-en_uso',
  DEVUELTA: 'status-devuelta',
  CANCELADA: 'status-cancelada',
};

export const ALL_STATUSES: BookingStatus[] = [
  'SOLICITADA',
  'APROBADA',
  'EN_PREPARACIÓN',
  'EN_USO',
  'DEVUELTA',
  'CANCELADA',
];
