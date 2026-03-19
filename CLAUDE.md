# CLAUDE.md — UASD Despacho

Guía de contexto para Claude Code. Leer antes de cualquier tarea.

## ¿Qué es este proyecto?

Sistema de despacho de combustible, aceites y repuestos para la flota vehicular de la **Universidad Autónoma de Santo Domingo (UASD)**. Departamento de Suministros / Transportación.

Permite registrar, controlar y reportar cada despacho de producto a cada vehículo, con control de inventario, auditoría completa y gestión de usuarios por roles.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Base de datos | PostgreSQL 16 |
| Auth | JWT en cookie HttpOnly (`uasd_token`), SameSite=strict |
| Contenedores | Docker + Docker Compose (4 servicios) |
| UI Components | Lucide React (iconos), Recharts (gráficas), ExcelJS (Excel), jsPDF (PDF) |

---

## Estructura

```
uasd-despacho/
├── backend/
│   └── src/
│       ├── app.js              # Entry point Express
│       ├── migrate.js          # Schema + seed (idempotente, corre al arrancar)
│       ├── db.js               # Pool PostgreSQL
│       ├── middleware/
│       │   ├── auth.js         # requireAuth, requireRole, requirePermiso
│       │   └── audit.js        # addAudit()
│       ├── lib/
│       │   └── mailer.js       # Nodemailer SMTP (opcional)
│       └── routes/
│           ├── auth.js         # /auth/* (login, logout, me, avatar, profile, reset, etc.)
│           ├── usuarios.js     # /usuarios/* (CRUD + soft delete)
│           ├── despachos.js    # /despachos/* (crear, listar, exportar CSV)
│           ├── vehiculos.js    # /vehiculos/*
│           ├── dependencias.js # /dependencias/*
│           ├── productos.js    # /productos/* (inventario)
│           ├── reportes.js     # /reportes/* (dashboard, consumo, por vehículo, etc.)
│           └── auditoria.js    # /auditoria/*
├── src/
│   ├── App.jsx                 # Router + lazy imports de páginas
│   ├── context/
│   │   ├── AuthContext.jsx     # user, login, logout, refreshUser, hasRole, hasPermiso
│   │   ├── DataContext.jsx     # despachos, productos, vehiculos, dependencias, usuarios
│   │   └── ThemeContext.jsx    # dark/light mode
│   ├── hooks/
│   │   ├── usePagination.js    # paginación client-side
│   │   ├── useConfirm.jsx      # modal de confirmación
│   │   └── useInactivityTimer.js
│   ├── lib/
│   │   ├── api.js              # fetch wrapper (base /api, credentials: include)
│   │   ├── exportXlsx.js       # ExcelJS styled exports
│   │   ├── exportPdf.js        # jsPDF exports
│   │   └── exportCsv.js
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── NuevoDespacho.jsx
│   │   ├── Despachos.jsx       # historial con filtros
│   │   ├── Inventario.jsx
│   │   ├── Vehiculos.jsx
│   │   ├── Dependencias.jsx
│   │   ├── Reportes.jsx        # tabs: diario, mensual, por vehículo, por dependencia, inventario
│   │   ├── Auditoria.jsx
│   │   ├── Usuarios.jsx        # solo admin
│   │   ├── Perfil.jsx          # avatar, datos personales, seguridad, actividad
│   │   ├── Login.jsx
│   │   └── ResetPassword.jsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Layout.jsx      # shell con sidebar, header, inactivity timer
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Header.jsx      # notificaciones, usuarios online
│   │   │   ├── UserMenu.jsx    # menú de usuario con avatar
│   │   │   └── StockAlertBanner.jsx
│   │   └── ui/
│   │       ├── Modal.jsx       # max-h-[90vh] + overflow-y-auto
│   │       ├── Button.jsx
│   │       ├── Input.jsx / Select
│   │       ├── Badge.jsx
│   │       ├── Card.jsx        # Card, CardHeader(children), CardBody(children)
│   │       ├── UserAvatar.jsx  # sm/md/lg/xl — respeta avatar_preset o avatar_url
│   │       ├── Paginator.jsx
│   │       ├── ForceChangePassword.jsx
│   │       └── AccessDenied.jsx
│   └── utils/
│       ├── format.js           # ROL_LABELS, CATEGORIA_LABELS, formatDate, formatNumber, validatePassword
│       └── avatar.js           # AVATAR_PRESETS (12), getPreset(), avatarStyle(), initials()
├── docker-compose.yml
├── docker-compose.yaml         # (duplicado — ignorar, usar el .yml)
└── backend/.env.example
```

---

## Puertos (desarrollo y producción local)

| Servicio | Puerto |
|----------|--------|
| Frontend (nginx) | `http://localhost:3001` |
| Frontend HTTPS | `https://localhost:3443` |
| Backend (interno) | `3000` (solo dentro de Docker, no expuesto) |
| PostgreSQL (interno) | `5432` (solo dentro de Docker) |

El frontend proxea `/api/*` → `http://api:3000` via nginx.

---

## Roles y permisos

| Rol | Acceso |
|-----|--------|
| `admin` | Total — gestión de usuarios, todo |
| `supervisor` | Despachos, inventario, vehículos, dependencias, reportes, auditoría |
| `despachador` | Despachos (ver + crear), inventario (ver), vehículos (ver), dependencias (ver), reportes |

Permisos granulares (JSONB en `usuarios.permisos`):
`despachos.ver`, `despachos.crear`, `inventario.ver`, `inventario.editar`, `vehiculos.ver`, `vehiculos.editar`, `dependencias.ver`, `dependencias.editar`, `reportes.ver`, `auditoria.ver`

Admin siempre tiene acceso total independientemente de la lista de permisos.

---

## Base de datos — tablas principales

| Tabla | Descripción |
|-------|-------------|
| `usuarios` | Incluye: `activo`, `eliminado`, `eliminado_at`, `must_change_password`, `avatar_preset`, `avatar_url`, `token_version`, `permisos` (JSONB), `last_seen`, `reset_token_hash` |
| `despachos` | FK a `vehiculos`, `productos`, `usuarios` — todas con `ON DELETE SET NULL` |
| `vehiculos` | FK a `dependencias` con `ON DELETE SET NULL` |
| `productos` | Stock con constraint `chk_stock_no_negativo` |
| `auditoria` | Log inmutable de todas las operaciones CRUD |
| `dependencias` | Unidades académicas/administrativas |

IDs son BIGINT (migrados de INT).

---

## Convenciones importantes

### API
- Todos los endpoints bajo `/api/` — el frontend usa `api.get('/ruta')` (sin `/api` porque el wrapper lo agrega)
- Errores retornan `{ error: 'mensaje' }` con status HTTP apropiado
- Listas retornan `{ data: [], total: N }` o arrays directos según el endpoint

### Frontend
- `useData()` — contexto global con datos cacheados; usar `loadUsuarios()`, `reload()` etc. para refrescar
- `useAuth()` — `user`, `isAuthenticated`, `hasRole()`, `hasPermiso()`, `refreshUser()`
- `useToast()` — `showToast(mensaje, 'success'|'error'|'warning')`
- `useConfirm()` — `await confirm(mensaje, { danger: true })` retorna boolean
- Paginación: `usePagination(items, pageSize)` → `{ paged, page, totalPages, goTo, reset }`
- `CardHeader` acepta solo `children` y `className` — NO tiene prop `action` ni `title`

### Soft delete de usuarios
- `eliminado = true` + `activo = false` + email mangleado (`email__eliminado__id`)
- Los despachos y auditoría conservan la referencia (ON DELETE SET NULL no aplica porque el registro existe)
- El GET `/usuarios` filtra `WHERE eliminado IS NOT TRUE`
- GET `/usuarios/eliminados` retorna solo los eliminados (solo admin)

### Avatar
- `avatar_preset`: key del array `AVATAR_PRESETS` en `src/utils/avatar.js` (ej. `'blue'`, `'teal'`)
- `avatar_url`: base64 data URL de foto subida (máx ~450KB)
- `UserAvatar` component: muestra foto > preset > iniciales con color primario

---

## Despliegue

```bash
# Construir y levantar todos los servicios
docker compose up -d --build

# Ver logs
docker compose logs -f api
docker compose logs -f frontend

# Sola la migración (corre automáticamente al arrancar api)
docker compose exec api node src/migrate.js
```

La migración es **idempotente** — se puede correr múltiples veces sin daño. Agrega columnas con `IF NOT EXISTS`.

---

## Issues conocidos (pendientes de corrección)

- **B3** `UserMenu.jsx`: wrapper del avatar no tiene `rounded-full` — el borde dorado no se ve circular
- **B4/B5** `Perfil.jsx`: `handleUpdate` llama `refreshUser()` pero no usa el objeto retornado por el backend directamente
- **B2** `Dashboard.jsx:163`: `recentDespachos = despachos` sin `.slice()` — puede ser lento con muchos registros
- **W5** `Usuarios.jsx`: el buscador no llama `resetPage()` — no hay buscador de texto aún (solo tabla paginada)

---

## Roadmap (próximas funciones)

### Fase 1 — Correcciones
- [ ] B3: Fix borde avatar en UserMenu
- [ ] B2: Limitar recentDespachos a últimos 10 en Dashboard
- [ ] Buscador de texto en lista de Usuarios
- [ ] Timeout en `api.js` (AbortController 30s)

### Fase 2 — Mejoras
- [ ] Editar/corregir despacho con justificación y auditoría
- [ ] Historial de despachos desde ficha de vehículo
- [ ] Dashboard inventario: mostrar todos o "ver más"
- [ ] Buscador en modal de usuarios eliminados

### Fase 3 — Nuevas funciones
- [ ] Notificaciones en tiempo real (polling)
- [ ] Dashboard personalizado por rol
- [ ] Exportar reporte por dependencia a Excel
