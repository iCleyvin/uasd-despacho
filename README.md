# Sistema de Despacho UASD

Sistema de gestión de despachos, inventario de combustible y vehículos para la **Universidad Autónoma de Santo Domingo (UASD)**.

## Stack tecnológico

| Capa       | Tecnología                          |
|------------|-------------------------------------|
| Frontend   | React 18 + Vite + Tailwind CSS      |
| Backend    | Node.js + Express                   |
| Base datos | PostgreSQL 16                       |
| Proxy      | Nginx                               |
| Contenedores | Docker + Docker Compose           |
| CI/CD      | GitHub Actions → Coolify            |

## Funcionalidades

- Registro y seguimiento de despachos (combustible, productos)
- Gestión de vehículos y dependencias universitarias
- Inventario de productos con alertas de stock bajo
- Panel de usuarios en línea en tiempo real
- Sistema de roles y permisos (admin, supervisor, despachador)
- Auditoría completa de operaciones con diffs JSONB
- Exportación a PDF y CSV
- Backups automáticos diarios de la base de datos
- Comprobantes de despacho en PDF imprimibles

## Requisitos

- Docker Desktop 4.x o superior
- Docker Compose v2

## Instalación y arranque

### 1. Clonar el repositorio

```bash
git clone <repo-url>
cd uasd-despacho
```

### 2. Configurar variables de entorno

Copia el archivo de ejemplo y edita los valores:

```bash
cp backend/.env.example .env
```

Edita `.env` y reemplaza todos los valores marcados con `CAMBIA_ESTO`:

| Variable               | Descripción                                  |
|------------------------|----------------------------------------------|
| `POSTGRES_PASSWORD`    | Contraseña de la base de datos               |
| `JWT_SECRET`           | Clave secreta para firmar tokens JWT (64+ bytes hex) |
| `CORS_ORIGIN`          | IP o dominio del frontend (ej. `http://10.2.20.3:3001`) |
| `ADMIN_INITIAL_PASSWORD` | Contraseña del admin en el primer arranque |

Genera valores seguros con Node.js:

```bash
# JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# POSTGRES_PASSWORD
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

### 3. Levantar los contenedores

```bash
docker compose up -d
```

Los servicios inician en este orden: `db` → `api` → `frontend` → `backup`

### 4. Acceder a la aplicación

La aplicación estará disponible en: `http://<IP-SERVIDOR>:3001`

En la primera ejecución se crea automáticamente el usuario administrador con el email configurado en la migración y la contraseña definida en `ADMIN_INITIAL_PASSWORD`.

> **Importante:** Después del primer login, cambia la contraseña del admin y deja `ADMIN_INITIAL_PASSWORD` vacía en el `.env`.

## Estructura del proyecto

```
uasd-despacho/
├── backend/                  # API REST (Express)
│   ├── src/
│   │   ├── app.js            # Configuración de Express y middlewares
│   │   ├── db.js             # Pool de conexiones PostgreSQL
│   │   ├── migrate.js        # Schema y datos iniciales
│   │   ├── middleware/
│   │   │   ├── auth.js       # JWT, roles y permisos
│   │   │   └── audit.js      # Log de auditoría
│   │   └── routes/           # Endpoints REST
│   └── tests/                # Tests con Jest + Supertest
├── src/                      # Frontend React
│   ├── pages/                # Vistas principales
│   ├── components/           # Componentes UI
│   ├── context/              # AuthContext, DataContext, ThemeContext
│   └── lib/                  # api.js, exportPdf.js, exportCsv.js
├── backup/
│   ├── backup.sh             # Script de backup diario (02:00)
│   └── cleanup.sh            # Limpieza de auditoría antigua (mensual)
├── nginx.conf                # Proxy inverso + headers de seguridad
├── docker-compose.yml        # Orquestación de servicios
└── Dockerfile                # Build del frontend (nginx)
```

## Comandos útiles

### Ver logs

```bash
# Todos los servicios
docker compose logs -f

# Solo el API
docker compose logs -f api

# Solo el frontend
docker compose logs -f frontend
```

### Ejecutar backup manual

```bash
docker compose exec backup /tmp/backup.sh
```

Los backups se almacenan en `./backups/` con retención de 7 días.

### Reiniciar un servicio

```bash
docker compose restart api
```

### Reconstruir tras cambios de código

```bash
docker compose up -d --build
```

### Detener todo

```bash
docker compose down
```

> Para eliminar también los datos de la BD: `docker compose down -v`

## Desarrollo local (sin Docker)

### Backend

```bash
cd backend
cp .env.example .env   # ajustar DATABASE_URL a tu PostgreSQL local
npm install
npm run migrate        # crea tablas y seed
npm run dev            # recarga automática con --watch
```

### Frontend

```bash
# en la raíz del proyecto
npm install
npm run dev            # Vite en http://localhost:5173
```

El proxy de Vite redirige `/api/*` al backend configurado en `vite.config.js`.

## Tests

```bash
cd backend
npm test               # corre todos los tests con Jest
npm run test:watch     # modo interactivo
```

Los tests usan mocks de la BD y no requieren PostgreSQL. Cubren:

- Health endpoint (ok y fallo de BD)
- Login: campos faltantes, credenciales inválidas, login exitoso y cookie HttpOnly
- Logout
- Rutas protegidas sin autenticación
- Token firmado con secret incorrecto
- Reset de contraseña: campos faltantes, política de contraseñas, token inválido
- Cabeceras de seguridad (X-Content-Type-Options, X-Frame-Options)

## Roles y permisos

| Rol           | Acceso                                                            |
|---------------|-------------------------------------------------------------------|
| `admin`       | Acceso total: usuarios, configuración, auditoría, invalidar sesiones |
| `supervisor`  | Ver reportes, auditoría, usuarios en línea                        |
| `despachador` | Crear y gestionar despachos, ver inventario                       |

## Seguridad

- Autenticación via JWT en cookie **HttpOnly** (no accesible desde JavaScript)
- Rate limiting: 200 req/15min global, 10 intentos/15min en login
- Protección contra timing attacks en login (bcrypt constante)
- Cabeceras de seguridad via Helmet.js + Nginx (CSP, X-Frame-Options, etc.)
- Queries parametrizadas (protección SQL injection)
- Política de contraseñas: mínimo 8 caracteres, mayúscula, número y símbolo
- Auditoría de todas las operaciones CREATE/UPDATE/DELETE

## Variables de entorno de referencia

Ver [`backend/.env.example`](backend/.env.example) para la lista completa con descripciones y comandos de generación.

## Backups

El servicio `backup` ejecuta automáticamente:

- **02:00 diario** — `pg_dump` comprimido en `./backups/` (retención 7 días)
- **03:00 primer día del mes** — limpieza de registros de auditoría con más de 6 meses

## CI/CD

El pipeline en `.github/workflows/build.yml` ejecuta en cada push a `main`:

1. Build de la imagen Docker del frontend
2. Push a GitHub Container Registry (GHCR)
3. Deploy automático vía webhook de Coolify
