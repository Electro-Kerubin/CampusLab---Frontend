// Tipos compartidos de la aplicación CampusLab

export type PageId = 'dashboard' | 'bookings' | 'catalog' | 'reports' | 'audit';

// Coincide 1:1 con el enum BookingStatus de ms-campuslab-bookings.
// Ojo: EN_PREPARACION va SIN tilde (así está en el backend).
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

export interface AppUser {
  name: string;
  email: string;
  avatar: string;
  role: string; // Informativo - proviene del token de Azure AD, no se elige en login
}

/**
 * Refleja BookingResponse de ms-campuslab-bookings (vía ms-campuslab-bff).
 * startTime/endTime/createdAt/updatedAt llegan como LocalDateTime ISO
 * (ej: "2026-09-20T09:00:00", sin zona horaria).
 */
export interface Booking {
  id: number;
  resourceId: number;
  /** Nombre del recurso, agregado por el BFF desde ms-catalog (puede venir null si ese servicio no responde). */
  resourceNombre: string | null;
  studentEmail: string;
  purpose: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
}

// ─── Catálogo: refleja ms-campuslab-catalog (vía ms-campuslab-bff) ─────────

/** Refleja LabResponseDTO. */
export interface Lab {
  id: number;
  name: string;
  location: string | null;
  capacity: number;
  createdAt: string;
}

/** Un "recurso" reservable: SALA, EQUIPO o INSUMO. Es lo que referencia Booking.resourceId. */
export type ResourceType = 'SALA' | 'EQUIPO' | 'INSUMO';
export type ResourceStatus = 'DISPONIBLE' | 'EN_USO' | 'MANTENIMIENTO' | 'BAJA';

/** Refleja ResourceResponseDTO. */
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

/** Refleja CategoryResponseDTO. */
export interface Category {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
}

/** POST/PUT /api/catalog/labs */
export interface LabRequest {
  name: string;
  location?: string;
  capacity: number;
}

/** POST /api/catalog/resources */
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

/** PUT /api/catalog/resources/{id}/stock */
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

// ─── Contratos REST con el backend Spring Boot ─────────────────────────

/**
 * POST /api/bookings.
 * studentEmail se omite normalmente: el backend lo completa desde el JWT
 * del usuario autenticado. Solo tiene sentido enviarlo si un TECNICO/ADMIN
 * reserva a nombre de otro estudiante.
 */
export interface CreateBookingRequest {
  resourceId: number;
  purpose: string;
  startTime: string;
  endTime: string;
  studentEmail?: string;
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

export const ALL_STATUSES: BookingStatus[] = [
  'SOLICITADA',
  'APROBADA',
  'EN_PREPARACION',
  'EN_USO',
  'DEVUELTA',
  'CANCELADA',
];

/**
 * Máquina de estados real de ms-campuslab-bookings (ver
 * BookingService.TRANSICIONES_VALIDAS). El frontend la usa para no ofrecer
 * transiciones que el backend rechazaría con 409/400.
 */
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
