# Pruebas del frontend de CampusLab

Este documento explica **qué se prueba, cómo se ejecuta y por qué** en el frontend de CampusLab
(Angular 21 standalone, Tailwind 3, ng2-charts y login con Microsoft Entra ID vía MSAL).

## Resumen

| Qué | Herramienta | Comando | Resultado medido (2026-11-23) |
|---|---|---|---|
| Pruebas unitarias y de componentes | Jasmine + Karma (Chrome headless) | `npm run test:ci` | **172 pruebas, 172 OK** |
| Cobertura de código | karma-coverage (Istanbul) | incluida en `npm run test:ci` | Sentencias **97,2 %** · Ramas **88,88 %** · Funciones **95,2 %** · Líneas **97,57 %** |
| Análisis estático (lint) | ESLint + angular-eslint | `npm run lint` | **0 errores**, 22 advertencias (deuda documentada abajo) |
| Compilación de producción | Angular CLI (esbuild) | `npm run build` | OK, salida en `dist/campuslab/browser` |
| Integración continua | GitHub Actions | `.github/workflows/frontend-ci.yml` | Ejecuta todo lo anterior en `main`, `dev` y `test` |

Punto de partida antes de este trabajo: 44 pruebas (1 fallando), cobertura de 53,7 % de sentencias
y 29,25 % de ramas, sin lint y con un CI que llamaba a scripts que no existían.

---

## 1. Preparar el entorno (Codespaces o local)

| Paso | Comando | Por qué |
|---|---|---|
| 1. Node 20.19+, 22.12+ o 24 | `node -v` | Angular 21 no funciona con versiones anteriores de Node. |
| 2. Instalar dependencias | `npm ci` | Instala exactamente las versiones de `package-lock.json`: todos prueban con lo mismo. |
| 3. Tener Google Chrome | `google-chrome --version` | Karma ejecuta las pruebas dentro de un Chrome real, sin ventana (headless). En Codespaces ya está instalado; en GitHub Actions viene en `ubuntu-latest`. |
| 4. Usar el CLI local | `npx ng ...` | `ng` no está instalado globalmente; `npx` usa la versión del proyecto. Los scripts de `npm run` ya lo hacen solos. |

No hace falta backend, ni Azure, ni variables de entorno para correr las pruebas.

## 2. Cómo ejecutar

```bash
npm run test:ci        # una pasada, Chrome headless, con cobertura y umbral (lo mismo que corre el CI)
npm run test:demo      # igual, pero lista cada prueba por nombre con ✓/✗ (para presentar)
npm run coverage:open  # sirve el reporte HTML de cobertura en el puerto 8090
npm test               # modo desarrollo: queda escuchando y re-ejecuta al guardar
npm run lint           # ESLint sobre src/**/*.ts y las plantillas
npm run build          # build de producción
```

- El reporte de cobertura navegable queda en `coverage/campuslab/index.html` (también `lcov.info`
  para herramientas como SonarQube). La carpeta `coverage/` está en `.gitignore`.
- Para correr un solo archivo de pruebas mientras se trabaja, cambiar temporalmente su `describe(`
  por `fdescribe(` (y no subirlo así).

## 3. Reglas que siguen todas las pruebas

1. **Nunca se llama a Azure ni a un backend real.**
   - MSAL se reemplaza por un doble en memoria (`src/testing/msal-testing.ts`): solo se decide qué
     cuenta "tiene en caché" MSAL y se espían `loginRedirect`, `logoutRedirect` y `acquireTokenSilent`.
   - Las llamadas HTTP pasan por `HttpTestingController`: la prueba ve cada request y decide la
     respuesta (200, 401, 500...). Ninguna sale a la red.
   - *Por qué:* las pruebas tienen que dar el mismo resultado en cualquier máquina y en el CI, sin
     credenciales y sin depender de que los microservicios estén arriba.
2. **Cada `it()` verifica un comportamiento y falla si ese comportamiento se rompe.** No hay pruebas
   del tipo "el componente existe". Se comprobó con una prueba de mutación (sección 6).
3. **Se prueba el código real**: los servicios, guards y componentes reales; solo se simulan sus
   dependencias externas (MSAL, HTTP, y a veces el rol del usuario).

## 4. Qué cubre cada archivo de pruebas

| Archivo | Pruebas | Riesgo que cubre |
|---|---:|---|
| `app.routing.spec.ts` | 13 | **Navegación al abrir la app** con la configuración real (`appConfig`, guards, arranque de MSAL): sin sesión → `/login`; ADMIN → `/dashboard`; AUDITOR → `/audit`; recargar una página interna no la cambia; sin rol válido no hay bucle `/login ↔ /dashboard`; retorno del login de Microsoft. |
| `guards/auth.guard.spec.ts` | 7 | **Seguridad de rutas internas**: sin sesión, sin cuentas, sin cuenta activa o con un rol desconocido → `/login` (y en este último caso se fuerza el logout); espera a que MSAL termine antes de decidir. |
| `guards/landing.spec.ts` | 8 | Pantalla de inicio según el rol (`landingPath`) y el guard de `/login` (`guestGuard`). |
| `services/auth.service.spec.ts` | 15 | Cómo se arma el usuario desde la cuenta de Azure AD: roles desde `roles`, `appRoles`, `wids` o el id_token; normalización a mayúsculas; etiqueta legible ("Técnico / Auditor"); iniciales; logout forzado si no hay roles; `hasRole`/`hasAnyRole`; MSAL todavía no inicializado. |
| `services/auth.interceptor.spec.ts` | 10 | **Envío del token** (`Authorization: Bearer ...`, exigido por el README): token en caché, refresco silencioso cuando vence, fallo del refresco, sin sesión; manejo de **401** (cierra sesión → `/login`), **403** (→ `/dashboard`) y 500. |
| `services/data.service.spec.ts` | 26 | **Contrato REST** (URL, método y body de cada endpoint); **fallback a datos demo** cuando el backend falla; la auditoría y la DLQ **nunca** muestran datos inventados; todos los `computed` (KPIs, ocupación, distribución por estado, flujo de reservas, top recursos). |
| `pages/dashboard-page.component.spec.ts` | 11 | KPIs visibles, anillo de ocupación, gráficos, sección de mensajería solo para ADMIN/TECNICO, botones "Nueva Reserva" y "Actualizar". |
| `pages/bookings-page.component.spec.ts` | 21 | Lista, filtros por estado y texto, detalle, **transiciones válidas de la máquina de estados**, permisos por rol (cambiar estado, crear), errores del backend (409 sin stock), y el modal de nueva reserva (validaciones y body del POST). |
| `pages/catalog-page.component.spec.ts` | 16 | Pestañas y conteos, buscador, alerta de **stock bajo**, permisos (ADMIN crea, TECNICO ajusta stock, ESTUDIANTE solo lee), ajuste de stock (validación del número, errores), guardado desde modales. |
| `pages/new-resource-modal.component.spec.ts` | 5 | Regresión del QA: un insumo se envía con unidad de medida y un equipo con número de serie. |
| `pages/reports-page.component.spec.ts` | 6 | Tarjetas KPI, gráficos ordenados por hora, top recursos, distribución de estados y estados vacíos. |
| `pages/audit-page.component.spec.ts` | 10 | Búsqueda, filtro por tipo, detalle de evento, `?q=` desde el buscador global, rango de fechas, "Limpiar", aviso de **servicio no disponible**. |
| `pages/page-headers.spec.ts` | 7 | Regresión del QA: títulos de página sin texto técnico y sin el aviso de Kafka; recarga del catálogo tras cambiar el estado de una reserva. |
| `pages/login-page.component.spec.ts` | 4 | Solo existe el botón de Microsoft, estado "Conectando…" y mensaje de error si el login falla. |
| `components/layout.component.spec.ts` | 10 | Menú de navegación, usuario en sesión, **cerrar sesión** y el buscador global (reservas, labs, recursos, `#id` exacto, navegación con `?q=`). |
| `msal-config.spec.ts` | 3 | Configuración de MSAL: clientId/authority/redirectUri del environment, sesión en `localStorage`, login por redirect. |
| **Total** | **172** | |

Hay un solo archivo de pruebas de rutas: `app.routing.spec.ts`. **No existe un `app.routes.spec.ts`**
(no hubo nada que deduplicar). Se conserva `app.routing.spec.ts` porque prueba con la configuración
real de la aplicación, que es justamente donde estaban los bugs de navegación.

### ¿Y las pruebas E2E (Cypress)?

Se decidió **no incluirlas** en esta etapa. El login es exclusivamente con Microsoft y la app no tiene
un modo demo de autenticación, así que un E2E con sesión necesitaría o bien una cuenta real de Azure
(prohibido en las pruebas) o una configuración de build especial con MSAL simulado. Los flujos que un
E2E cubriría (navegación por rol, reservas, catálogo) ya están cubiertos con pruebas de componentes y
de rutas con la configuración real. Ver "Pendientes".

## 5. Cobertura y umbral

`karma.conf.js` exige un mínimo global. Si una contribución baja la cobertura de estos valores,
`npm run test:ci` falla y el CI queda en rojo:

| Métrica | Medido | Umbral |
|---|---:|---:|
| Sentencias | 97,2 % | 95 % |
| Ramas | 88,88 % | 85 % |
| Funciones | 95,2 % | 92 % |
| Líneas | 97,57 % | 95 % |

*Por qué no 100 % ni el valor exacto:* el umbral está 2-4 puntos por debajo de lo medido para que un
cambio pequeño y legítimo no rompa el CI, pero sin dejar que la cobertura se degrade. Propuesta:
subir el umbral de ramas a 90 % cuando se cubran las ramas que faltan en `catalog-page`
(75 % de ramas) y `auth.guard` (78 %).

Lo que no se mide a propósito: `src/testing/**` (son las utilidades de prueba, no código de la app).

## 6. ¿Cómo sabemos que las pruebas sirven? (prueba de mutación)

Se introdujeron a propósito 3 bugs en el código de producción, se corrió la suite y luego se revirtió:

| Bug introducido | Pruebas que lo detectaron |
|---|---|
| Permitir `SOLICITADA → DEVUELTA` en la máquina de estados | 1 (Reservas: transiciones válidas) |
| Un AUDITOR aterriza en `/dashboard` en vez de `/audit` | 6 (rutas, `guestGuard`, `landingPath`) |
| Enviar el token sin el prefijo `Bearer ` | 4 (interceptor) |

Resultado: **10 pruebas fallaron**, es decir, los tres bugs habrían quedado en rojo en el CI.

## 7. Lint

`npm run lint` usa ESLint con las reglas recomendadas de TypeScript y de angular-eslint
(incluida accesibilidad de plantillas). Hoy da **0 errores** y **22 advertencias**, que son deuda
conocida y se dejaron como *warning* para no cambiar UI ni API en esta tarea:

- **19 × `label-has-associated-control`** (accesibilidad): los `<label>` de los formularios no están
  ligados a su `<input>` con `for`/`id`. Un lector de pantalla no anuncia el nombre del campo.
- **3 × `no-output-native`**: los modales emiten un evento llamado `close`, igual que un evento nativo
  del DOM. Renombrarlo cambia la API de los componentes.

## 8. Integración continua (GitHub Actions)

`.github/workflows/frontend-ci.yml` corre en cada push y Pull Request a `main`, `dev` y `test`:

1. `npm ci`: instala dependencias exactas.
2. `npm run lint`: si hay errores de lint, se detiene.
3. `npm run test:ci`: pruebas y umbral de cobertura.
4. Publica `coverage/campuslab/` como artefacto descargable (aunque las pruebas fallen, para poder revisar).
5. `npm run build`: confirma que la app compila para producción.
6. Publica `dist/campuslab/browser/` como artefacto.

*Por qué en este orden:* lo más rápido y barato primero (lint), así un error simple no espera a que
compile todo.

## 9. Problemas conocidos del entorno local (Codespaces)

- **VS Code abre el puerto de Karma (9876) en el navegador** al reenviarlo, y esa pestaña se suma
  como "navegador de pruebas" y altera el resultado. `.vscode/settings.json` le dice a VS Code que
  ignore ese puerto. Si ya estaba reenviado: panel *Ports* → clic derecho en 9876 →
  *Stop Forwarding Port*, y cerrar la pestaña.
- **Procesos interrumpidos (SIGTERM) en Codespaces**: en esta máquina (2 núcleos) se observó que un
  proceso externo al repo termina `ng test` de forma intermitente. Si eso pasa durante Karma,
  **Angular CLI sale con código 0 sin haber ejecutado pruebas** (falso verde, verificado).
  Por eso `npm run test:ci` usa `scripts/assert-tests-ran.cjs`: borra la cobertura antes y falla si
  después no existe `coverage/campuslab/lcov.info`. Si una ejecución se corta, volver a correrla.
- Se usa `builderMode: "application"` (esbuild) para las pruebas en `angular.json`: compila más
  rápido y con menos memoria que el modo antiguo basado en webpack, que se colgaba con más frecuencia.

## 10. Cómo mostrarlo en la presentación

### El día anterior
1. Hacer push de la rama: GitHub Actions corre lint, pruebas y build. Guardar el link de esa
   ejecución en verde (pestaña *Actions* del repo).
2. Correr una vez `npm run test:demo`: deja la caché de compilación lista (la demo tarda ~1 min)
   y genera el reporte de cobertura.
3. **Plan B:** captura o grabación de la salida de `test:demo` y de la página de Actions, por si el
   Codespace interrumpe una ejecución en vivo (ver sección 9).
4. En *Ports*, confirmar que el 9876 no está reenviado.

### En vivo (≈ 4 minutos para el frontend)

| # | Qué mostrar | Cómo | Qué decir |
|---|---|---|---|
| 1 | Estrategia | Tabla de la sección 4 | "Probamos servicios, seguridad, componentes y navegación. Nunca llamamos a Azure ni al backend: los reemplazamos por dobles de prueba, así las pruebas son repetibles." |
| 2 | Ejecución | `npm run test:demo` | Recorrer la lista: guards y roles, interceptor (Bearer, 401/403), fallback a datos demo, auditoría que nunca inventa datos. Cerrar con el total y la cobertura. |
| 3 | Cobertura | `npm run coverage:open` → panel *Ports* → 8090 → abrir en navegador | Tabla por archivo; abrir uno (p. ej. `auth.interceptor.ts`) para ver líneas cubiertas en verde. |
| 4 | Que las pruebas sirven (opcional) | En `src/app/guards/landing.ts` cambiar `'/audit'` por `'/dashboard'`, correr `npm run test:ci`, ver las pruebas en rojo, y `git checkout src/app/guards/landing.ts` | "Si alguien rompe la regla de que un auditor aterriza en Auditoría, el CI lo detecta." |
| 5 | Calidad estática | `npm run lint` | 0 errores; las 22 advertencias son deuda conocida (sección 7). |
| 6 | Automatización | Link de GitHub Actions | Cada push ejecuta lint → pruebas con umbral → build, y publica la cobertura y el build como artefactos. |

Alternativa visual si se presenta desde un computador con Chrome (no Codespaces):
`npx ng test --browsers=Chrome` abre Chrome con el reporte HTML de Jasmine, que lista todas las
pruebas y re-ejecuta al guardar.

## 11. Pendientes

- **E2E**: si se quieren en el futuro, crear una configuración `e2e` en `angular.json` que reemplace
  `msal-config.ts` por un MSAL simulado con una cuenta de prueba (sin tocar el build normal) y usar
  Cypress o Playwright con `cy.intercept` para el backend.
- Corregir la deuda de lint (labels y outputs `close`) y luego volver esas reglas a *error*.
- Subir el umbral de ramas a 90 %.
