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

/** Roles de App Role de Azure AD, tal como los valida cada microservicio (@PreAuthorize). */
export type Role = 'ADMIN' | 'TECNICO' | 'ESTUDIANTE' | 'AUDITOR';

export interface AppUser {
  name: string;
  email: string;
  avatar: string;
  role: string; // Etiqueta legible para mostrar en la UI (puede combinar varios roles)
  /** Roles crudos (en mayúsculas) tal como vienen del claim "roles" del id_token. */
  roles: Role[];
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

/**
 * Usados solo en el Dashboard. No reflejan ningún endpoint real — no existe
 * ms-catalog/ms-report que exponga "impresoras/microscopios/pcs" ni
 * ocupación por categoría de equipo; el Dashboard los muestra con datos de
 * demostración a propósito hasta que haya un backend real para esto.
 */
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

/**
 * Refleja BookingHourlyMetricResponse de ms-campuslab-report
 * (GET /api/report/kpis?range=last24h, vía el BFF). Se llena consumiendo
 * eventos Kafka del topic "bookings.events" — viene vacío si Kafka no está
 * corriendo o no hubo reservas SOLICITADA en las últimas 24h.
 */
export interface BookingHourlyMetric {
  labId: number;
  bucketHour: string;
  bookingsCount: number;
  avgCycleMinutes: number | null;
}

/**
 * Refleja ResourceUsageMetricResponse de ms-campuslab-report
 * (GET /api/report/top-resources?range=last7d, vía el BFF). Mismo origen
 * (eventos Kafka) que BookingHourlyMetric.
 */
export interface ResourceUsageMetric {
  resourceId: number;
  periodStart: string;
  periodEnd: string;
  usageCount: number;
  totalDurationMinutes: number | null;
}

/**
 * Fila del donut de "Distribución de Estados". No viene de ningún backend:
 * se calcula en el cliente agrupando dataService.bookings() por estado
 * (son datos reales de ms-campuslab-bookings, solo que agregados acá en
 * vez de en ms-report).
 */
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

/** Mismos estados que STATUS_CLASSES, pero en hex — para charts (Chart.js no acepta clases Tailwind). */
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
