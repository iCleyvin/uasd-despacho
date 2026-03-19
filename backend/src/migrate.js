require('dotenv').config()
const bcrypt = require('bcryptjs')
const db = require('./db')

// ── Schema ────────────────────────────────────────────────────────────────────
const SCHEMA = `
CREATE TABLE IF NOT EXISTS usuarios (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(100)  NOT NULL,
  apellido      VARCHAR(100)  NOT NULL,
  email         VARCHAR(255)  UNIQUE NOT NULL,
  password_hash VARCHAR(255)  NOT NULL,
  rol           VARCHAR(20)   NOT NULL CHECK (rol IN ('admin','supervisor','despachador')),
  activo        BOOLEAN       DEFAULT true,
  created_at    TIMESTAMPTZ   DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dependencias (
  id         SERIAL PRIMARY KEY,
  nombre     VARCHAR(200)  NOT NULL,
  codigo     VARCHAR(10)   UNIQUE NOT NULL,
  activo     BOOLEAN       DEFAULT true,
  created_at TIMESTAMPTZ   DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehiculos (
  id             SERIAL PRIMARY KEY,
  placa          VARCHAR(20)   UNIQUE NOT NULL,
  marca          VARCHAR(100)  NOT NULL,
  modelo         VARCHAR(100)  NOT NULL,
  anio           INTEGER,
  tipo           VARCHAR(50),
  color          VARCHAR(50)   DEFAULT '',
  dependencia_id INTEGER       REFERENCES dependencias(id),
  combustible    VARCHAR(20)   DEFAULT 'gasolina',
  activo         BOOLEAN       DEFAULT true,
  created_at     TIMESTAMPTZ   DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS productos (
  id              SERIAL PRIMARY KEY,
  nombre          VARCHAR(200)  NOT NULL,
  categoria       VARCHAR(50)   NOT NULL,
  unidad          VARCHAR(50)   NOT NULL,
  stock_actual    NUMERIC(10,2) DEFAULT 0,
  stock_minimo    NUMERIC(10,2) DEFAULT 0,
  precio_unitario NUMERIC(10,2) DEFAULT 0,
  activo          BOOLEAN       DEFAULT true,
  created_at      TIMESTAMPTZ   DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS despachos (
  id              SERIAL PRIMARY KEY,
  vehiculo_id     INTEGER       REFERENCES vehiculos(id),
  producto_id     INTEGER       REFERENCES productos(id),
  cantidad        NUMERIC(10,2) NOT NULL,
  unidad          VARCHAR(50),
  despachado_por  INTEGER       REFERENCES usuarios(id),
  solicitado_por  VARCHAR(200),
  cedula_receptor VARCHAR(20),
  km_vehiculo     INTEGER,
  observaciones   TEXT,
  fecha_despacho  TIMESTAMPTZ   DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auditoria (
  id          SERIAL PRIMARY KEY,
  accion      VARCHAR(20)  NOT NULL,
  tabla       VARCHAR(50)  NOT NULL,
  registro_id INTEGER,
  usuario_id  INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
  datos_antes JSONB,
  datos_nuevo JSONB,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_despachos_vehiculo      ON despachos(vehiculo_id);
CREATE INDEX IF NOT EXISTS idx_despachos_producto      ON despachos(producto_id);
CREATE INDEX IF NOT EXISTS idx_despachos_fecha         ON despachos(fecha_despacho DESC);
CREATE INDEX IF NOT EXISTS idx_despachos_despachado    ON despachos(despachado_por);
CREATE INDEX IF NOT EXISTS idx_auditoria_tabla         ON auditoria(tabla);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha         ON auditoria(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario       ON auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_registro      ON auditoria(registro_id);
CREATE INDEX IF NOT EXISTS idx_vehiculos_placa         ON vehiculos(placa);
CREATE INDEX IF NOT EXISTS idx_vehiculos_dependencia   ON vehiculos(dependencia_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_email          ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_activos        ON usuarios(activo) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_productos_categoria     ON productos(categoria);
`

// ── Seed data ─────────────────────────────────────────────────────────────────
const DEPENDENCIAS = [
  { nombre: 'RECTORIA', codigo: 'REC' },
  { nombre: 'VICE ADMVA', codigo: 'VA' },
  { nombre: 'VICE DOCENTE', codigo: 'VD' },
  { nombre: 'VICE POSTGRADO', codigo: 'VP' },
  { nombre: 'VICE EXTENSION', codigo: 'VE' },
  { nombre: 'SECRETARIA GRAL', codigo: 'SG' },
  { nombre: 'MEDICINA', codigo: 'MED' },
  { nombre: 'FAC. CIENCIAS', codigo: 'FC' },
  { nombre: 'FAC. HUMANIDADES', codigo: 'FH' },
  { nombre: 'FAC. ECONOMIA', codigo: 'FE' },
  { nombre: 'FAC. INGENIERIA', codigo: 'FI' },
  { nombre: 'FAC. EDUCACION', codigo: 'FE2' },
  { nombre: 'FAC. CS JURIDICAS', codigo: 'FCJ' },
  { nombre: 'FAC. ARTES', codigo: 'FA' },
  { nombre: 'TESORERIA', codigo: 'TES' },
  { nombre: 'DECANATO AGROVET', codigo: 'DA' },
  { nombre: 'RECURSOS HUMANOS', codigo: 'RH' },
  { nombre: 'CONTRALORIA', codigo: 'CON' },
  { nombre: 'ASODEMU', codigo: 'ASO' },
  { nombre: 'AUDITORIA GENERAL', codigo: 'AG' },
  { nombre: 'SEGURIDAD', codigo: 'SEG' },
  { nombre: 'FED', codigo: 'FED' },
  { nombre: 'SUMINISTRO', codigo: 'SUM' },
  { nombre: 'ECONOMATO', codigo: 'ECO' },
  { nombre: 'UASD MAO', codigo: 'UM' },
  { nombre: 'TALLER MECANICA', codigo: 'TM' },
  { nombre: 'UASD PUERTO PLATA', codigo: 'UPP' },
  { nombre: 'UASD SANTIAGO', codigo: 'USA' },
  { nombre: 'TRANSPORTACION', codigo: 'TRA' },
  { nombre: 'UASD NAGUA', codigo: 'UNA' },
  { nombre: 'UASD SAN JUAN', codigo: 'USJ' },
  { nombre: 'INFORMATICA', codigo: 'INF' },
  { nombre: 'UASD SAN FRANCISCO DE MACORIS', codigo: 'USFM' },
  { nombre: 'PLANTA FISICA', codigo: 'PF' },
  { nombre: 'MAYORDOMIA', codigo: 'MAY' },
  { nombre: 'ORNATO', codigo: 'ORN' },
  { nombre: 'UASD BANI', codigo: 'UBA' },
  { nombre: 'UASD LA VEGA', codigo: 'ULV' },
  { nombre: 'PROTOCOLO', codigo: 'PRO' },
  { nombre: 'UASD BARAHONA', codigo: 'UBH' },
  { nombre: 'UASD SAN PEDRO DE MACORIS', codigo: 'USPM' },
  { nombre: 'UASD BONAO', codigo: 'UBO' },
  { nombre: 'UASD HATO MAYOR', codigo: 'UHM' },
  { nombre: 'UASD HIGUEY', codigo: 'UHI' },
  { nombre: 'UASD NEYBA', codigo: 'UNE' },
  { nombre: 'UASD SAN CRISTOBAL', codigo: 'USC' },
  { nombre: 'UASD SANTO DOMINGO NORTE', codigo: 'USDN' },
  { nombre: 'UASD SANTO DOMINGO ESTE', codigo: 'USDE' },
  { nombre: 'UASD SANTO DOMINGO OESTE', codigo: 'USDO' },
  { nombre: 'UASD SANTIAGO RODRIGUEZ', codigo: 'USR' },
  { nombre: 'UASD SFM', codigo: 'USFM2' },
  { nombre: 'PRESUPUESTO', codigo: 'PRES' },
  { nombre: 'COMPRAS', codigo: 'COM' },
  { nombre: 'GERENCIA FINANCIERA', codigo: 'GF' },
  { nombre: 'ADMISIONES', codigo: 'ADM' },
  { nombre: 'BIENESTAR ESTUDIANTIL', codigo: 'BE' },
  { nombre: 'COMEDOR', codigo: 'CMD' },
  { nombre: 'RESIDENCIA ESTUDIANTIL', codigo: 'RE' },
  { nombre: 'RESIDENCIAS MEDICAS', codigo: 'RM' },
  { nombre: 'CONSULTORIA JURIDICA', codigo: 'CJ' },
  { nombre: 'RELACIONES PUBLICAS', codigo: 'RP' },
  { nombre: 'PLAN DE RETIRO', codigo: 'PR' },
  { nombre: 'AGROVET', codigo: 'AGV' },
  { nombre: 'SIERRA PRIETA', codigo: 'SP' },
  { nombre: 'FINCA', codigo: 'FIN' },
  { nombre: 'INST. GEOGRAFICO', codigo: 'IG' },
  { nombre: 'INST. SISMOLOGICO', codigo: 'IS' },
  { nombre: 'LABO-UASD', codigo: 'LAB' },
  { nombre: 'VETERINARIA', codigo: 'VET' },
  { nombre: 'ESC. DE ENFERMERIA', codigo: 'EE' },
  { nombre: 'ESC. SALUD PUBLICA', codigo: 'ESP' },
  { nombre: 'FAC. CS DE LA SALUD', codigo: 'FCS' },
  { nombre: 'FAC. AGRONOMIA', codigo: 'FAGR' },
  { nombre: 'AUDIOVISUAL', codigo: 'AUD' },
  { nombre: 'DIR. GRAL. COMUNICACIONES', codigo: 'DGC' },
  { nombre: 'SOLIDARIDAD Y ESPERANZA', codigo: 'SE' },
  { nombre: 'COOP. INTERNACIONAL', codigo: 'CI' },
  { nombre: 'DIGEPLANDI', codigo: 'DIG' },
  { nombre: 'INMOBILIARIA', codigo: 'INM' },
  { nombre: 'TRANSITO', codigo: 'TRN' },
  { nombre: 'RED DE CAFETERIAS', codigo: 'RC' },
  { nombre: 'FAPROUASD', codigo: 'FAP' },
  { nombre: 'ARS UASD', codigo: 'ARS' },
  { nombre: 'CONTRALORIA ADMINISTRATIVA', codigo: 'CA' },
  { nombre: 'DIR. GRAL. POSTGRADO', codigo: 'DGP' },
  { nombre: 'CENTROS REGIONALES', codigo: 'CR' },
  { nombre: 'RIESGOS Y DESASTRES', codigo: 'RD' },
  { nombre: 'SANTIAGO RODRIGUEZ', codigo: 'SR' },
]

const VEHICULOS = [
  { placa: 'F-001', marca: 'Toyota',      modelo: 'Land Cruiser',   anio: 2020, tipo: 'jeepeta',    dep: 'RECTORIA',          combustible: 'gasolina' },
  { placa: 'F-002', marca: 'Lexus',       modelo: 'Lx-570',         anio: 2010, tipo: 'jeepeta',    dep: 'RECTORIA',          combustible: 'gasolina' },
  { placa: 'F-003', marca: 'Toyota',      modelo: 'Fortuner',       anio: 2008, tipo: 'jeepeta',    dep: 'RECTORIA',          combustible: 'gasolina' },
  { placa: 'F-004', marca: 'Toyota',      modelo: '4 Runner',       anio: 2020, tipo: 'jeepeta',    dep: 'VICE ADMVA',        combustible: 'gasolina' },
  { placa: 'F-005', marca: 'Toyota',      modelo: '4 Runner',       anio: 2020, tipo: 'jeepeta',    dep: 'VICE DOCENTE',      combustible: 'gasolina' },
  { placa: 'F-006', marca: 'Toyota',      modelo: '4 Runner',       anio: 2020, tipo: 'jeepeta',    dep: 'VICE POSTGRADO',    combustible: 'gasolina' },
  { placa: 'F-007', marca: 'Toyota',      modelo: '4 Runner',       anio: 2020, tipo: 'jeepeta',    dep: 'VICE EXTENSION',    combustible: 'gasolina' },
  { placa: 'F-008', marca: 'Toyota',      modelo: '4 Runner',       anio: 2020, tipo: 'jeepeta',    dep: 'SECRETARIA GRAL',   combustible: 'gasolina' },
  { placa: 'F-009', marca: 'Toyota',      modelo: 'Fortuner',       anio: 2020, tipo: 'jeepeta',    dep: 'MEDICINA',          combustible: 'gasolina' },
  { placa: 'F-010', marca: 'Toyota',      modelo: 'Fortuner',       anio: 2020, tipo: 'jeepeta',    dep: 'MEDICINA',          combustible: 'gasolina' },
  { placa: 'F-011', marca: 'Toyota',      modelo: 'Hilux',          anio: 2020, tipo: 'pickup',     dep: 'PLANTA FISICA',     combustible: 'gasoil'   },
  { placa: 'F-012', marca: 'Toyota',      modelo: 'Hilux',          anio: 2019, tipo: 'pickup',     dep: 'PLANTA FISICA',     combustible: 'gasoil'   },
  { placa: 'F-013', marca: 'Toyota',      modelo: 'Hilux',          anio: 2018, tipo: 'pickup',     dep: 'PLANTA FISICA',     combustible: 'gasoil'   },
  { placa: 'F-014', marca: 'Ford',        modelo: 'F-150',          anio: 2019, tipo: 'pickup',     dep: 'SUMINISTRO',        combustible: 'gasoil'   },
  { placa: 'F-015', marca: 'Mitsubishi',  modelo: 'L200',           anio: 2018, tipo: 'pickup',     dep: 'SUMINISTRO',        combustible: 'gasoil'   },
  { placa: 'F-016', marca: 'Hyundai',     modelo: 'H100',           anio: 2015, tipo: 'camion',     dep: 'ECONOMATO',         combustible: 'gasoil'   },
  { placa: 'F-017', marca: 'Hyundai',     modelo: 'H100',           anio: 2015, tipo: 'camion',     dep: 'COMEDOR',           combustible: 'gasoil'   },
  { placa: 'F-018', marca: 'Hino',        modelo: '300',            anio: 2017, tipo: 'camion',     dep: 'PLANTA FISICA',     combustible: 'gasoil'   },
  { placa: 'F-019', marca: 'Hino',        modelo: '300',            anio: 2017, tipo: 'camion',     dep: 'PLANTA FISICA',     combustible: 'gasoil'   },
  { placa: 'F-020', marca: 'Isuzu',       modelo: 'Npr',            anio: 2016, tipo: 'camion',     dep: 'SUMINISTRO',        combustible: 'gasoil'   },
  { placa: 'F-021', marca: 'Toyota',      modelo: 'Hiace',          anio: 2019, tipo: 'microbus',   dep: 'TRANSPORTACION',    combustible: 'gasoil'   },
  { placa: 'F-022', marca: 'Toyota',      modelo: 'Hiace',          anio: 2019, tipo: 'microbus',   dep: 'TRANSPORTACION',    combustible: 'gasoil'   },
  { placa: 'F-023', marca: 'Toyota',      modelo: 'Hiace',          anio: 2018, tipo: 'microbus',   dep: 'TRANSPORTACION',    combustible: 'gasoil'   },
  { placa: 'F-024', marca: 'Toyota',      modelo: 'Hiace',          anio: 2018, tipo: 'microbus',   dep: 'TRANSPORTACION',    combustible: 'gasoil'   },
  { placa: 'F-025', marca: 'Toyota',      modelo: 'Hiace',          anio: 2017, tipo: 'microbus',   dep: 'TRANSPORTACION',    combustible: 'gasoil'   },
  { placa: 'F-026', marca: 'Toyota',      modelo: 'Hiace',          anio: 2017, tipo: 'microbus',   dep: 'TRANSPORTACION',    combustible: 'gasoil'   },
  { placa: 'F-027', marca: 'Toyota',      modelo: 'Hiace',          anio: 2016, tipo: 'microbus',   dep: 'TRANSPORTACION',    combustible: 'gasoil'   },
  { placa: 'F-028', marca: 'Hyundai',     modelo: 'County',         anio: 2015, tipo: 'microbus',   dep: 'TRANSPORTACION',    combustible: 'gasoil'   },
  { placa: 'F-029', marca: 'Hyundai',     modelo: 'County',         anio: 2015, tipo: 'microbus',   dep: 'TRANSPORTACION',    combustible: 'gasoil'   },
  { placa: 'F-030', marca: 'Hyundai',     modelo: 'Universe',       anio: 2014, tipo: 'autobus',    dep: 'TRANSPORTACION',    combustible: 'gasoil'   },
  { placa: 'F-031', marca: 'Hyundai',     modelo: 'Universe',       anio: 2014, tipo: 'autobus',    dep: 'TRANSPORTACION',    combustible: 'gasoil'   },
  { placa: 'F-032', marca: 'Hyundai',     modelo: 'Universe',       anio: 2013, tipo: 'autobus',    dep: 'TRANSPORTACION',    combustible: 'gasoil'   },
  { placa: 'F-033', marca: 'Hyundai',     modelo: 'Universe',       anio: 2013, tipo: 'autobus',    dep: 'TRANSPORTACION',    combustible: 'gasoil'   },
  { placa: 'F-034', marca: 'Hyundai',     modelo: 'Universe',       anio: 2012, tipo: 'autobus',    dep: 'TRANSPORTACION',    combustible: 'gasoil'   },
  { placa: 'F-035', marca: 'Hyundai',     modelo: 'Universe',       anio: 2012, tipo: 'autobus',    dep: 'TRANSPORTACION',    combustible: 'gasoil'   },
  { placa: 'F-036', marca: 'Kia',         modelo: 'Frontier',       anio: 2010, tipo: 'camion',     dep: 'ORNATO',            combustible: 'gasoil'   },
  { placa: 'F-037', marca: 'Toyota',      modelo: 'Hilux',          anio: 2015, tipo: 'pickup',     dep: 'ORNATO',            combustible: 'gasoil'   },
  { placa: 'F-038', marca: 'Toyota',      modelo: 'Hilux',          anio: 2015, tipo: 'pickup',     dep: 'ORNATO',            combustible: 'gasoil'   },
  { placa: 'F-039', marca: 'Toyota',      modelo: 'Hilux',          anio: 2014, tipo: 'pickup',     dep: 'ORNATO',            combustible: 'gasoil'   },
  { placa: 'F-040', marca: 'Toyota',      modelo: 'Hilux',          anio: 2014, tipo: 'pickup',     dep: 'ORNATO',            combustible: 'gasoil'   },
  { placa: 'F-041', marca: 'Yamaha',      modelo: 'Ybr125',         anio: 2018, tipo: 'motocicleta', dep: 'SEGURIDAD',        combustible: 'gasolina' },
  { placa: 'F-042', marca: 'Yamaha',      modelo: 'Ybr125',         anio: 2018, tipo: 'motocicleta', dep: 'SEGURIDAD',        combustible: 'gasolina' },
  { placa: 'F-043', marca: 'Yamaha',      modelo: 'Ybr125',         anio: 2017, tipo: 'motocicleta', dep: 'SEGURIDAD',        combustible: 'gasolina' },
  { placa: 'F-044', marca: 'Yamaha',      modelo: 'Ybr125',         anio: 2017, tipo: 'motocicleta', dep: 'SEGURIDAD',        combustible: 'gasolina' },
  { placa: 'F-045', marca: 'Honda',       modelo: 'Cg150',          anio: 2019, tipo: 'motocicleta', dep: 'SEGURIDAD',        combustible: 'gasolina' },
  { placa: 'F-046', marca: 'Honda',       modelo: 'Cg150',          anio: 2019, tipo: 'motocicleta', dep: 'SEGURIDAD',        combustible: 'gasolina' },
  { placa: 'F-047', marca: 'Toyota',      modelo: 'Yaris',          anio: 2018, tipo: 'sedan',       dep: 'ADMISIONES',       combustible: 'gasolina' },
  { placa: 'F-048', marca: 'Toyota',      modelo: 'Corolla',        anio: 2017, tipo: 'sedan',       dep: 'RECURSOS HUMANOS', combustible: 'gasolina' },
  { placa: 'F-049', marca: 'Toyota',      modelo: 'Corolla',        anio: 2017, tipo: 'sedan',       dep: 'COMPRAS',          combustible: 'gasolina' },
  { placa: 'F-050', marca: 'Hyundai',     modelo: 'Elantra',        anio: 2018, tipo: 'sedan',       dep: 'AUDITORIA GENERAL',combustible: 'gasolina' },
  { placa: 'F-051', marca: 'Hyundai',     modelo: 'Elantra',        anio: 2018, tipo: 'sedan',       dep: 'CONTRALORIA',      combustible: 'gasolina' },
  { placa: 'F-052', marca: 'Nissan',      modelo: 'Sentra',         anio: 2019, tipo: 'sedan',       dep: 'PRESUPUESTO',      combustible: 'gasolina' },
  { placa: 'F-053', marca: 'Nissan',      modelo: 'Sentra',         anio: 2019, tipo: 'sedan',       dep: 'TESORERIA',        combustible: 'gasolina' },
  { placa: 'F-054', marca: 'Toyota',      modelo: 'Fortuner',       anio: 2016, tipo: 'jeepeta',     dep: 'FAC. INGENIERIA',  combustible: 'gasolina' },
  { placa: 'F-055', marca: 'Toyota',      modelo: 'Fortuner',       anio: 2016, tipo: 'jeepeta',     dep: 'FAC. CIENCIAS',    combustible: 'gasolina' },
  { placa: 'F-056', marca: 'Toyota',      modelo: 'Fortuner',       anio: 2015, tipo: 'jeepeta',     dep: 'FAC. HUMANIDADES', combustible: 'gasolina' },
  { placa: 'F-057', marca: 'Toyota',      modelo: 'Fortuner',       anio: 2015, tipo: 'jeepeta',     dep: 'FAC. ECONOMIA',    combustible: 'gasolina' },
  { placa: 'F-058', marca: 'Toyota',      modelo: 'Fortuner',       anio: 2015, tipo: 'jeepeta',     dep: 'FAC. EDUCACION',   combustible: 'gasolina' },
  { placa: 'F-059', marca: 'Toyota',      modelo: 'Fortuner',       anio: 2014, tipo: 'jeepeta',     dep: 'FAC. CS JURIDICAS',combustible: 'gasolina' },
  { placa: 'F-060', marca: 'Toyota',      modelo: 'Fortuner',       anio: 2014, tipo: 'jeepeta',     dep: 'FAC. ARTES',       combustible: 'gasolina' },
  { placa: 'F-061', marca: 'Toyota',      modelo: 'Hilux',          anio: 2020, tipo: 'pickup',      dep: 'TALLER MECANICA',  combustible: 'gasoil'   },
  { placa: 'F-062', marca: 'Toyota',      modelo: 'Hilux',          anio: 2019, tipo: 'pickup',      dep: 'INFORMATICA',      combustible: 'gasoil'   },
  { placa: 'F-063', marca: 'Toyota',      modelo: 'Hiace',          anio: 2020, tipo: 'microbus',    dep: 'UASD SANTIAGO',    combustible: 'gasoil'   },
  { placa: 'F-064', marca: 'Toyota',      modelo: 'Hiace',          anio: 2019, tipo: 'microbus',    dep: 'UASD SANTIAGO',    combustible: 'gasoil'   },
  { placa: 'F-065', marca: 'Hyundai',     modelo: 'Universe',       anio: 2018, tipo: 'autobus',     dep: 'UASD SANTIAGO',    combustible: 'gasoil'   },
  { placa: 'F-066', marca: 'Toyota',      modelo: 'Hiace',          anio: 2018, tipo: 'microbus',    dep: 'UASD MAO',         combustible: 'gasoil'   },
  { placa: 'F-067', marca: 'Toyota',      modelo: 'Hiace',          anio: 2017, tipo: 'microbus',    dep: 'UASD PUERTO PLATA',combustible: 'gasoil'   },
  { placa: 'F-068', marca: 'Toyota',      modelo: 'Hiace',          anio: 2017, tipo: 'microbus',    dep: 'UASD NAGUA',       combustible: 'gasoil'   },
  { placa: 'F-069', marca: 'Toyota',      modelo: 'Hiace',          anio: 2016, tipo: 'microbus',    dep: 'UASD SAN JUAN',    combustible: 'gasoil'   },
  { placa: 'F-070', marca: 'Toyota',      modelo: 'Hiace',          anio: 2016, tipo: 'microbus',    dep: 'UASD BARAHONA',    combustible: 'gasoil'   },
  { placa: 'F-071', marca: 'Toyota',      modelo: 'Hilux',          anio: 2021, tipo: 'pickup',      dep: 'AGROVET',          combustible: 'gasoil'   },
  { placa: 'F-072', marca: 'Toyota',      modelo: 'Hilux',          anio: 2020, tipo: 'pickup',      dep: 'AGROVET',          combustible: 'gasoil'   },
  { placa: 'F-073', marca: 'Toyota',      modelo: 'Hilux',          anio: 2019, tipo: 'pickup',      dep: 'SIERRA PRIETA',    combustible: 'gasoil'   },
  { placa: 'F-074', marca: 'Toyota',      modelo: 'Hilux',          anio: 2018, tipo: 'pickup',      dep: 'FINCA',            combustible: 'gasoil'   },
  { placa: 'F-075', marca: 'Toyota',      modelo: 'Land Cruiser',   anio: 2015, tipo: 'jeepeta',     dep: 'INST. GEOGRAFICO', combustible: 'gasoil'   },
  { placa: 'F-076', marca: 'Toyota',      modelo: 'Land Cruiser',   anio: 2014, tipo: 'jeepeta',     dep: 'INST. SISMOLOGICO',combustible: 'gasoil'   },
  { placa: 'F-077', marca: 'Yamaha',      modelo: 'Fazer250',       anio: 2020, tipo: 'motocicleta', dep: 'SEGURIDAD',        combustible: 'gasolina' },
  { placa: 'F-078', marca: 'Yamaha',      modelo: 'Fazer250',       anio: 2020, tipo: 'motocicleta', dep: 'SEGURIDAD',        combustible: 'gasolina' },
  { placa: 'F-079', marca: 'Toyota',      modelo: 'Fortuner',       anio: 2019, tipo: 'jeepeta',     dep: 'GERENCIA FINANCIERA', combustible: 'gasolina' },
  { placa: 'F-080', marca: 'Toyota',      modelo: 'Fortuner',       anio: 2018, tipo: 'jeepeta',     dep: 'CONSULTORIA JURIDICA', combustible: 'gasolina' },
  { placa: 'F-081', marca: 'Toyota',      modelo: 'Fortuner',       anio: 2018, tipo: 'jeepeta',     dep: 'RELACIONES PUBLICAS', combustible: 'gasolina' },
  { placa: 'F-082', marca: 'Toyota',      modelo: 'Corolla',        anio: 2020, tipo: 'sedan',       dep: 'PROTOCOLO',        combustible: 'gasolina' },
  { placa: 'F-083', marca: 'Toyota',      modelo: 'Corolla',        anio: 2019, tipo: 'sedan',       dep: 'AUDIOVISUAL',      combustible: 'gasolina' },
  { placa: 'F-084', marca: 'Hyundai',     modelo: 'Starex',         anio: 2016, tipo: 'microbus',    dep: 'BIENESTAR ESTUDIANTIL', combustible: 'gasoil' },
  { placa: 'F-085', marca: 'Hyundai',     modelo: 'Starex',         anio: 2015, tipo: 'microbus',    dep: 'RESIDENCIA ESTUDIANTIL', combustible: 'gasoil' },
  { placa: 'F-086', marca: 'Hyundai',     modelo: 'Starex',         anio: 2015, tipo: 'microbus',    dep: 'RESIDENCIAS MEDICAS', combustible: 'gasoil' },
  { placa: 'F-087', marca: 'Ford',        modelo: 'Transit',        anio: 2019, tipo: 'microbus',    dep: 'UASD BANI',        combustible: 'gasoil'   },
  { placa: 'F-088', marca: 'Ford',        modelo: 'Transit',        anio: 2018, tipo: 'microbus',    dep: 'UASD LA VEGA',     combustible: 'gasoil'   },
  { placa: 'F-089', marca: 'Ford',        modelo: 'Transit',        anio: 2018, tipo: 'microbus',    dep: 'UASD BONAO',       combustible: 'gasoil'   },
  { placa: 'F-090', marca: 'Ford',        modelo: 'Transit',        anio: 2017, tipo: 'microbus',    dep: 'UASD HATO MAYOR',  combustible: 'gasoil'   },
  { placa: 'F-091', marca: 'Ford',        modelo: 'Transit',        anio: 2017, tipo: 'microbus',    dep: 'UASD HIGUEY',      combustible: 'gasoil'   },
  { placa: 'F-092', marca: 'Ford',        modelo: 'Transit',        anio: 2016, tipo: 'microbus',    dep: 'UASD NEYBA',       combustible: 'gasoil'   },
  { placa: 'F-093', marca: 'Ford',        modelo: 'Transit',        anio: 2016, tipo: 'microbus',    dep: 'UASD SAN CRISTOBAL', combustible: 'gasoil' },
  { placa: 'F-094', marca: 'Toyota',      modelo: 'Hiace',          anio: 2020, tipo: 'microbus',    dep: 'UASD SAN PEDRO DE MACORIS', combustible: 'gasoil' },
  { placa: 'F-095', marca: 'Toyota',      modelo: 'Hiace',          anio: 2019, tipo: 'microbus',    dep: 'UASD SANTO DOMINGO NORTE', combustible: 'gasoil' },
  { placa: 'F-096', marca: 'Toyota',      modelo: 'Hiace',          anio: 2018, tipo: 'microbus',    dep: 'UASD SANTO DOMINGO ESTE', combustible: 'gasoil' },
  { placa: 'F-097', marca: 'Toyota',      modelo: 'Hiace',          anio: 2017, tipo: 'microbus',    dep: 'UASD SANTO DOMINGO OESTE', combustible: 'gasoil' },
  { placa: 'F-098', marca: 'Toyota',      modelo: 'Hiace',          anio: 2017, tipo: 'microbus',    dep: 'UASD SANTIAGO RODRIGUEZ', combustible: 'gasoil' },
  { placa: 'F-099', marca: 'Hyundai',     modelo: 'Universe',       anio: 2016, tipo: 'autobus',     dep: 'UASD SANTIAGO',    combustible: 'gasoil'   },
  { placa: 'F-100', marca: 'Hyundai',     modelo: 'Universe',       anio: 2015, tipo: 'autobus',     dep: 'UASD MAO',         combustible: 'gasoil'   },
]

const PRODUCTOS = [
  { nombre: 'Gasolina Regular',    categoria: 'combustible',        unidad: 'galones', stock_actual: 450,  stock_minimo: 100, precio_unitario: 280 },
  { nombre: 'Gasoil',             categoria: 'combustible',        unidad: 'galones', stock_actual: 80,   stock_minimo: 100, precio_unitario: 260 },
  { nombre: 'Aceite Motor 20W-50', categoria: 'aceite_motor',       unidad: 'cuartos', stock_actual: 120,  stock_minimo: 50,  precio_unitario: 350 },
  { nombre: 'Aceite Motor 10W-30', categoria: 'aceite_motor',       unidad: 'cuartos', stock_actual: 45,   stock_minimo: 50,  precio_unitario: 380 },
  { nombre: 'Aceite Transmision',  categoria: 'aceite_transmision', unidad: 'cuartos', stock_actual: 30,   stock_minimo: 20,  precio_unitario: 420 },
  { nombre: 'Filtro de Aceite',   categoria: 'repuesto',           unidad: 'unidad',  stock_actual: 25,   stock_minimo: 10,  precio_unitario: 180 },
  { nombre: 'Filtro de Aire',     categoria: 'repuesto',           unidad: 'unidad',  stock_actual: 8,    stock_minimo: 10,  precio_unitario: 220 },
  { nombre: 'Liquido de Frenos',  categoria: 'repuesto',           unidad: 'litros',  stock_actual: 15,   stock_minimo: 5,   precio_unitario: 300 },
]

async function run() {
  console.log('▶ Creando schema...')
  await db.query(SCHEMA)

  // Usuarios
  const { rows: existingUsers } = await db.query('SELECT COUNT(*) FROM usuarios')
  if (Number(existingUsers[0].count) === 0) {
    console.log('▶ Insertando usuario administrador inicial...')
    const adminPassword = process.env.ADMIN_INITIAL_PASSWORD
    if (!adminPassword) {
      console.error('[migrate] ERROR: La variable ADMIN_INITIAL_PASSWORD es requerida para la primera ejecución.')
      process.exit(1)
    }
    const hash = await bcrypt.hash(adminPassword, 12)
    await db.query(
      'INSERT INTO usuarios (nombre, apellido, email, password_hash, rol) VALUES ($1,$2,$3,$4,$5)',
      ['Admin', 'Sistema', 'admin@uasd.edu.do', hash, 'admin']
    )
    console.log('▶ Usuario admin creado. Email: admin@uasd.edu.do — cambia la contraseña tras el primer login.')
  }

  // Dependencias
  const { rows: existingDeps } = await db.query('SELECT COUNT(*) FROM dependencias')
  if (Number(existingDeps[0].count) === 0) {
    console.log('▶ Insertando dependencias...')
    for (const d of DEPENDENCIAS) {
      await db.query('INSERT INTO dependencias (nombre, codigo) VALUES ($1,$2) ON CONFLICT (codigo) DO NOTHING', [d.nombre, d.codigo])
    }
  }

  // Vehículos
  const { rows: existingVehs } = await db.query('SELECT COUNT(*) FROM vehiculos')
  if (Number(existingVehs[0].count) === 0) {
    console.log('▶ Insertando vehiculos...')
    // Build dep name → id map
    const { rows: deps } = await db.query('SELECT id, nombre FROM dependencias')
    const depMap = {}
    deps.forEach(d => { depMap[d.nombre] = d.id })

    for (const v of VEHICULOS) {
      const depId = depMap[v.dep] ?? null
      await db.query(
        `INSERT INTO vehiculos (placa, marca, modelo, anio, tipo, dependencia_id, combustible)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (placa) DO NOTHING`,
        [v.placa, v.marca, v.modelo, v.anio, v.tipo, depId, v.combustible]
      )
    }
  }

  // Productos
  const { rows: existingProds } = await db.query('SELECT COUNT(*) FROM productos')
  if (Number(existingProds[0].count) === 0) {
    console.log('▶ Insertando productos...')
    for (const p of PRODUCTOS) {
      await db.query(
        'INSERT INTO productos (nombre, categoria, unidad, stock_actual, stock_minimo, precio_unitario) VALUES ($1,$2,$3,$4,$5,$6)',
        [p.nombre, p.categoria, p.unidad, p.stock_actual, p.stock_minimo, p.precio_unitario]
      )
    }
  }

  // Nuevas columnas (idempotente)
  await db.query(`ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS ficha_vieja VARCHAR(20)  DEFAULT NULL`)
  await db.query(`ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS matricula   VARCHAR(30)  DEFAULT NULL`)
  await db.query(`ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS chasis      VARCHAR(100) DEFAULT NULL`)

  // Columnas para reset de contraseña (token con expiración)
  await db.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS reset_token_hash    VARCHAR(128) DEFAULT NULL`)
  await db.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ  DEFAULT NULL`)

  // Columna para gestión de sesiones (incrementar para invalidar todos los tokens emitidos)
  await db.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS token_version INTEGER DEFAULT 1`)

  // Columna de permisos granulares por usuario
  await db.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS permisos JSONB DEFAULT '[]'`)

  // Poblar permisos por defecto según rol actual (solo para usuarios sin permisos asignados)
  await db.query(`
    UPDATE usuarios SET permisos = '["despachos.ver","despachos.crear","inventario.ver","inventario.editar","vehiculos.ver","vehiculos.editar","dependencias.ver","dependencias.editar","reportes.ver","auditoria.ver"]'::jsonb
    WHERE rol = 'supervisor' AND (permisos IS NULL OR permisos = '[]'::jsonb)
  `)
  await db.query(`
    UPDATE usuarios SET permisos = '["despachos.ver","despachos.crear","inventario.ver","vehiculos.ver","dependencias.ver","reportes.ver"]'::jsonb
    WHERE rol = 'despachador' AND (permisos IS NULL OR permisos = '[]'::jsonb)
  `)

  // Columna para presencia en línea
  await db.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NULL`)

  // Columna para forzar cambio de contraseña en primer login
  await db.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false`)

  // Restricción: el stock no puede ser negativo
  await db.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_stock_no_negativo') THEN
        ALTER TABLE productos ADD CONSTRAINT chk_stock_no_negativo CHECK (stock_actual >= 0);
      END IF;
    END $$
  `)

  // ── BIGSERIAL: ampliar todas las secuencias de INT a BIGINT ──────────────────
  // Previene overflow en producción a largo plazo (SERIAL max = 2.1 billones).
  // Es idempotente: si el tipo ya es BIGINT, no hace nada.
  await db.query(`
    DO $$ DECLARE
      tbl  text;
      seq  text;
    BEGIN
      FOREACH tbl IN ARRAY ARRAY['usuarios','dependencias','vehiculos','productos','despachos','auditoria']
      LOOP
        -- Solo actuar si la columna id sigue siendo INTEGER (no BIGINT)
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = tbl AND column_name = 'id' AND data_type = 'integer'
        ) THEN
          EXECUTE format('ALTER TABLE %I ALTER COLUMN id TYPE BIGINT', tbl);
          seq := pg_get_serial_sequence(tbl, 'id');
          IF seq IS NOT NULL THEN
            EXECUTE 'ALTER SEQUENCE ' || seq || ' AS BIGINT';
          END IF;
        END IF;
      END LOOP;
    END $$
  `)

  // ── Ampliar también las columnas FK que apuntan a esos ids ───────────────────
  await db.query(`
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vehiculos' AND column_name='dependencia_id' AND data_type='integer') THEN
        ALTER TABLE vehiculos ALTER COLUMN dependencia_id TYPE BIGINT;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='despachos' AND column_name='vehiculo_id' AND data_type='integer') THEN
        ALTER TABLE despachos ALTER COLUMN vehiculo_id  TYPE BIGINT;
        ALTER TABLE despachos ALTER COLUMN producto_id  TYPE BIGINT;
        ALTER TABLE despachos ALTER COLUMN despachado_por TYPE BIGINT;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='auditoria' AND column_name='usuario_id' AND data_type='integer') THEN
        ALTER TABLE auditoria ALTER COLUMN usuario_id   TYPE BIGINT;
        ALTER TABLE auditoria ALTER COLUMN registro_id  TYPE BIGINT;
      END IF;
    END $$
  `)

  // ── ON DELETE SET NULL en FK de despachos y vehiculos ────────────────────────
  // Sin esto, borrar un vehículo/producto/usuario lanza error de FK constraint.
  // SET NULL preserva el historial de despachos con referencias nulas (más seguro que CASCADE).
  await db.query(`
    DO $$ BEGIN
      -- vehiculos.dependencia_id
      IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vehiculos_dependencia_id_fkey') THEN
        ALTER TABLE vehiculos DROP CONSTRAINT vehiculos_dependencia_id_fkey;
      END IF;
      ALTER TABLE vehiculos ADD CONSTRAINT vehiculos_dependencia_id_fkey
        FOREIGN KEY (dependencia_id) REFERENCES dependencias(id) ON DELETE SET NULL;

      -- despachos.vehiculo_id
      IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'despachos_vehiculo_id_fkey') THEN
        ALTER TABLE despachos DROP CONSTRAINT despachos_vehiculo_id_fkey;
      END IF;
      ALTER TABLE despachos ADD CONSTRAINT despachos_vehiculo_id_fkey
        FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id) ON DELETE SET NULL;

      -- despachos.producto_id
      IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'despachos_producto_id_fkey') THEN
        ALTER TABLE despachos DROP CONSTRAINT despachos_producto_id_fkey;
      END IF;
      ALTER TABLE despachos ADD CONSTRAINT despachos_producto_id_fkey
        FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL;

      -- despachos.despachado_por
      IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'despachos_despachado_por_fkey') THEN
        ALTER TABLE despachos DROP CONSTRAINT despachos_despachado_por_fkey;
      END IF;
      ALTER TABLE despachos ADD CONSTRAINT despachos_despachado_por_fkey
        FOREIGN KEY (despachado_por) REFERENCES usuarios(id) ON DELETE SET NULL;
    END $$
  `)

  // Normalizar tipo y combustible a Title Case (idempotente)
  console.log('▶ Normalizando tipo y combustible a Title Case...')
  await db.query(`
    UPDATE vehiculos SET tipo = CASE LOWER(tipo)
      WHEN 'sedan'       THEN 'Sedan'
      WHEN 'jeepeta'     THEN 'Jeepeta'
      WHEN 'pickup'      THEN 'Pickup'
      WHEN 'camion'      THEN 'Camion'
      WHEN 'microbus'    THEN 'Microbus'
      WHEN 'minibus'     THEN 'Minibus'
      WHEN 'autobus'     THEN 'Autobus'
      WHEN 'tren'        THEN 'Tren'
      WHEN 'motocicleta' THEN 'Motocicleta'
      ELSE tipo
    END
    WHERE tipo IS NOT NULL AND tipo != initcap(tipo)
  `)
  await db.query(`
    UPDATE vehiculos SET combustible = CASE LOWER(combustible)
      WHEN 'gasolina'  THEN 'Gasolina'
      WHEN 'gasoil'    THEN 'Gasoil'
      WHEN 'electrico' THEN 'Electrico'
      WHEN 'hibrido'   THEN 'Hibrido'
      ELSE combustible
    END
    WHERE combustible IS NOT NULL AND combustible != initcap(combustible)
  `)

  const { rows: vu } = await db.query('SELECT COUNT(*) FROM usuarios')
  const { rows: vd } = await db.query('SELECT COUNT(*) FROM dependencias')
  const { rows: vv } = await db.query('SELECT COUNT(*) FROM vehiculos')
  const { rows: vp } = await db.query('SELECT COUNT(*) FROM productos')
  console.log(`✔ Migración completada — usuarios: ${vu[0].count}, dependencias: ${vd[0].count}, vehículos: ${vv[0].count}, productos: ${vp[0].count}`)
  process.exit(0)
}

run().catch(err => { console.error(err); process.exit(1) })
