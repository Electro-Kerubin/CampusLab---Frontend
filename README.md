# CampusLab — Frontend Angular

Aplicación frontend para gestión de laboratorios académicos, migrada de
React + Vite a **Angular 18 (standalone components)** + Tailwind CSS 3 +
ng2-charts (Chart.js) + MSAL Browser (Microsoft SSO).

## Login: solo Microsoft

A diferencia del frontend original en React, en esta versión Angular **el
login solo permite entrar con Microsoft** (Azure Active Directory / Microsoft
Entra ID). Se eliminaron los botones "Admin / Técnico / Estudiante /
Auditor".

Los roles reales (en caso de necesitarlos) deben derivarse del token JWT
emitido por Azure AD — no se eligen en el formulario de login.

## Requisitos

- Node.js 18+ (probado con Node 24)
- npm 9+

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm start
# o
npx ng serve
```

Abrir http://localhost:4200/

## Build de producción

```bash
npm run build
```

Los artefactos se generan en `dist/campuslab/`.

## Estructura del proyecto

```
src/
├── app/
│   ├── app.component.ts          # Root component (sólo router-outlet)
│   ├── app.config.ts             # Providers (router + charts + signals)
│   ├── app.routes.ts             # Rutas con lazy loading
│   │
│   ├── models/
│   │   └── index.ts              # Tipos y constantes compartidas
│   │
│   ├── services/
│   │   ├── auth.service.ts       # Login con Microsoft (MSAL)
│   │   └── data.service.ts       # Llamadas HTTP al backend Spring Boot
│   │
│   ├── guards/
│   │   └── auth.guard.ts         # Protege rutas internas
│   │
│   ├── components/
│   │   └── layout.component.ts   # Header + nav horizontal + router-outlet
│   │
│   └── pages/
│       ├── login-page.component.ts        # Solo botón Microsoft SSO
│       ├── dashboard-page.component.ts    # KPIs + gráficos
│       ├── bookings-page.component.ts     # Gestión de reservas + modal
│       ├── catalog-page.component.ts      # Tabs: labs/equipos/insumos
│       ├── reports-page.component.ts      # Analítica con charts
│       └── audit-page.component.ts        # Timeline de eventos Kafka
│
├── styles.css                    # Tailwind + estilos globales
├── index.html
└── main.ts                       # Bootstrap standalone
```

## Configuración de Azure AD SSO

Editar `src/app/services/auth.service.ts` y reemplazar:

```ts
const MSAL_CONFIG = {
  auth: {
    clientId: 'TU_CLIENT_ID_AZURE_AD',
    authority: 'https://login.microsoftonline.com/TU_TENANT_ID',
    redirectUri: window.location.origin + '/',
  },
  // ...
};
```

con los valores reales de tu App Registration en Azure Portal:

1. **Azure Portal** → App registrations → New registration
2. **Client ID**: el que aparece en "Overview → Application (client) ID"
3. **Tenant ID**: el de "Directory (tenant) ID"
4. **Redirect URI**: agregar la URL de tu app (ej. `http://localhost:4200/`)
   en "Authentication → Platform → Single-page application (SPA)"
5. **API permissions**: Microsoft Graph → `User.Read` (delegated)

Mientras el `clientId` tenga el valor `TU_CLIENT_ID_AZURE_AD`, el servicio
funciona en **modo demo**: al hacer clic en "Iniciar sesión con Microsoft"
se simula un login con un usuario de ejemplo (Carmen Vidal). Esto permite
desarrollar localmente sin tener Azure configurado.

## Rutas

| Ruta          | Componente               | Descripción                          |
| ------------- | ------------------------ | ------------------------------------ |
| `/login`      | LoginPageComponent       | Pantalla de login (sólo Microsoft)   |
| `/dashboard`  | DashboardPageComponent  | KPIs y estado del sistema            |
| `/bookings`   | BookingsPageComponent    | Gestión de reservas                  |
| `/catalog`    | CatalogPageComponent    | Laboratorios, equipos e insumos      |
| `/reports`    | ReportsPageComponent     | Analítica con charts                 |
| `/audit`      | AuditPageComponent       | Timeline de eventos de auditoría     |

## Diferencias con el original en React

| Aspecto                 | React (original)              | Angular (esta versión)                |
| ----------------------- | ----------------------------- | ------------------------------------- |
| Framework               | React 19 + Vite               | Angular 18 (standalone)               |
| Styling                 | Tailwind CSS 4                | Tailwind CSS 3                        |
| Charts                  | recharts                      | ng2-charts (Chart.js 4)               |
| Iconos                  | lucide-react                  | lucide-angular                        |
| Login                   | 4 botones de rol + Microsoft  | **Sólo Microsoft (Azure AD SSO)**     |
| Routing                 | useState manual              | Angular Router con guards             |
| Estado                  | useState/useEffect            | Signals (`signal()`, `computed()`)     |

## Integración con microservicios

Cada página muestra en el footer las rutas REST y topics Kafka que usa
(se mantienen del original):

- `ms-campuslab-bookings` → `/api/bookings/*`
- `ms-campuslab-catalog`  → `/api/catalog/*`
- `ms-campuslab-audit`    → `/api/audit/*` (Kafka topic `audit.timeline`)
- `ms-campuslab-report`   → `/api/report/*` (Kafka streaming)

El frontend ya está conectado por HTTP al backend Java **Spring Boot** a
través de `DataService` (`src/app/services/data.service.ts`). Si el backend
no responde, la app cae automáticamente en datos de demostración para
permitir desarrollar el frontend de forma independiente.

### Configuración de la URL del backend

- **Desarrollo**: `src/environments/environment.development.ts` usa `/api`
  relativo, redirigido por el proxy `proxy.conf.json` a
  `http://localhost:8080` (evita CORS durante `ng serve`).
- **Producción**: `src/environments/environment.ts` apunta a
  `http://localhost:8080/api` — ajustar al host/puerto real del API Gateway.

### Contrato REST esperado por el frontend

#### ms-campuslab-bookings

| Método | Endpoint                        | Descripción                          |
| ------ | ------------------------------- | ------------------------------------ |
| GET    | `/api/bookings`                 | Lista todas las reservas (`?status=` opcional) |
| POST   | `/api/bookings`                 | Crea reserva (`{lab, equipment, date, time, purpose, requester}`) |
| PUT    | `/api/bookings/{id}/status`     | Cambia estado (`{status}`)           |

#### ms-campuslab-catalog

| Método | Endpoint                        | Respuesta                            |
| ------ | ------------------------------- | ------------------------------------ |
| GET    | `/api/catalog/labs`             | `Lab[]` (id, name, type, capacity, available, total, location, status) |
| GET    | `/api/catalog/equipment`        | `Equipment[]` (id, name, lab, stock, total, status) |
| GET    | `/api/catalog/supplies`         | `Supply[]` (id, name, unit, stock, minStock, lab) |

#### ms-campuslab-audit

| Método | Endpoint                        | Descripción                          |
| ------ | ------------------------------- | ------------------------------------ |
| GET    | `/api/audit`                    | Eventos (`?tipo=&userId=&from=&to=` opcionales) |

#### ms-campuslab-report

| Método | Endpoint                          | Respuesta                            |
| ------ | --------------------------------- | ------------------------------------ |
| GET    | `/api/report/usage-by-hour`       | `[{h, impresoras, microscopios, pcs, labs}]` |
| GET    | `/api/report/equipment-status`    | `[{name, ocupado, disponible, mantenimiento}]` |
| GET    | `/api/report/bookings-by-hour`    | `[{h, reservas, canceladas}]`        |
| GET    | `/api/report/top-resources`       | `[{name, usos}]`                     |
| GET    | `/api/report/status-distribution` | `[{name, value, color}]`             |
| GET    | `/api/report/cycle-time`          | `[{semana, ciclo}]`                  |
| GET    | `/api/report/kpis`                | `{totalReservas, tasaAprobacion, tiempoCicloPromedio, tasaCancelacion}` |

Los tipos exactos están en `src/app/models/index.ts`. El `AuthService`
(Azure AD SSO) ya entrega el token JWT que debe enviarse como
`Authorization: Bearer ...` en cada request al API Gateway cuando el
backend lo requiera.
