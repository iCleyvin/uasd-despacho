// Datos de prueba para desarrollo — reemplazar con llamadas reales al API

export const DEPENDENCIAS = [
  { id: 1, nombre: 'Rectoría',                              codigo: 'REC', activo: true },
  { id: 2, nombre: 'Vicerrectoría Académica',               codigo: 'VAC', activo: true },
  { id: 3, nombre: 'Vicerrectoría Administrativa',          codigo: 'VAD', activo: true },
  { id: 4, nombre: 'Facultad de Ciencias',                  codigo: 'FCI', activo: true },
  { id: 5, nombre: 'Facultad de Ingeniería y Arquitectura', codigo: 'FIA', activo: true },
  { id: 6, nombre: 'Mantenimiento y Servicios Generales',   codigo: 'MSG', activo: true },
  { id: 7, nombre: 'Seguridad',                             codigo: 'SEG', activo: true },
  { id: 8, nombre: 'Transporte',                            codigo: 'TRA', activo: true },
]

export const PRODUCTOS = [
  { id: 1, nombre: 'Gasolina Regular',    categoria: 'combustible',        unidad: 'galones', stock_actual: 450,  stock_minimo: 100, precio_unitario: 280 },
  { id: 2, nombre: 'Gasoil',              categoria: 'combustible',        unidad: 'galones', stock_actual: 80,   stock_minimo: 100, precio_unitario: 260 },
  { id: 3, nombre: 'Aceite Motor 20W-50', categoria: 'aceite_motor',       unidad: 'cuartos', stock_actual: 120,  stock_minimo: 50,  precio_unitario: 350 },
  { id: 4, nombre: 'Aceite Motor 10W-30', categoria: 'aceite_motor',       unidad: 'cuartos', stock_actual: 45,   stock_minimo: 50,  precio_unitario: 380 },
  { id: 5, nombre: 'Aceite Transmisión',  categoria: 'aceite_transmision', unidad: 'cuartos', stock_actual: 30,   stock_minimo: 20,  precio_unitario: 420 },
  { id: 6, nombre: 'Filtro de Aceite',    categoria: 'repuesto',           unidad: 'unidad',  stock_actual: 25,   stock_minimo: 10,  precio_unitario: 180 },
  { id: 7, nombre: 'Filtro de Aire',      categoria: 'repuesto',           unidad: 'unidad',  stock_actual: 8,    stock_minimo: 10,  precio_unitario: 220 },
  { id: 8, nombre: 'Líquido de Frenos',   categoria: 'repuesto',           unidad: 'litros',  stock_actual: 15,   stock_minimo: 5,   precio_unitario: 300 },
]

export const VEHICULOS = [
  { id: 1, placa: 'A-12345', marca: 'Toyota',      modelo: 'Hilux',    año: 2020, tipo: 'pickup',      color: 'Blanco',   dependencia_id: 1, combustible: 'gasolina', activo: true },
  { id: 2, placa: 'B-67890', marca: 'Hyundai',     modelo: 'H-1',      año: 2019, tipo: 'camion',      color: 'Azul',     dependencia_id: 6, combustible: 'gasoil',   activo: true },
  { id: 3, placa: 'C-11111', marca: 'Kia',         modelo: 'Sportage', año: 2021, tipo: 'sedan',       color: 'Negro',    dependencia_id: 2, combustible: 'gasolina', activo: true },
  { id: 4, placa: 'D-22222', marca: 'Mitsubishi',  modelo: 'L200',     año: 2018, tipo: 'pickup',      color: 'Gris',     dependencia_id: 5, combustible: 'gasoil',   activo: true },
  { id: 5, placa: 'E-33333', marca: 'Honda',       modelo: 'Wave',     año: 2022, tipo: 'motocicleta', color: 'Rojo',     dependencia_id: 7, combustible: 'gasolina', activo: true },
  { id: 6, placa: 'F-44444', marca: 'Mercedes',    modelo: 'Sprinter', año: 2017, tipo: 'autobus',     color: 'Blanco',   dependencia_id: 8, combustible: 'gasoil',   activo: true },
]

export const DESPACHOS = [
  { id: 1,  vehiculo_id: 1, producto_id: 1, cantidad: 10, unidad: 'galones', despachado_por: 2, solicitado_por: 'Pedro Martínez', cedula_receptor: '001-0000001-1', km_vehiculo: 45230, fecha_despacho: '2026-03-15T08:30:00', observaciones: null },
  { id: 2,  vehiculo_id: 3, producto_id: 3, cantidad: 4,  unidad: 'cuartos', despachado_por: 2, solicitado_por: 'Luis García',    cedula_receptor: null,            km_vehiculo: 32100, fecha_despacho: '2026-03-15T09:15:00', observaciones: 'Cambio de aceite' },
  { id: 3,  vehiculo_id: 2, producto_id: 2, cantidad: 15, unidad: 'galones', despachado_por: 2, solicitado_por: 'Carlos Díaz',    cedula_receptor: '001-0000003-3', km_vehiculo: 78900, fecha_despacho: '2026-03-15T10:00:00', observaciones: null },
  { id: 4,  vehiculo_id: 4, producto_id: 4, cantidad: 6,  unidad: 'cuartos', despachado_por: 2, solicitado_por: 'José Ramírez',   cedula_receptor: null,            km_vehiculo: 55400, fecha_despacho: '2026-03-14T08:00:00', observaciones: null },
  { id: 5,  vehiculo_id: 1, producto_id: 1, cantidad: 8,  unidad: 'galones', despachado_por: 2, solicitado_por: 'Pedro Martínez', cedula_receptor: '001-0000001-1', km_vehiculo: 45190, fecha_despacho: '2026-03-14T14:00:00', observaciones: null },
  { id: 6,  vehiculo_id: 5, producto_id: 1, cantidad: 2,  unidad: 'galones', despachado_por: 2, solicitado_por: 'Ana Sánchez',   cedula_receptor: null,            km_vehiculo: 12000, fecha_despacho: '2026-03-13T07:30:00', observaciones: null },
  { id: 7,  vehiculo_id: 6, producto_id: 2, cantidad: 20, unidad: 'galones', despachado_por: 2, solicitado_por: 'Roberto Núñez', cedula_receptor: '001-0000007-7', km_vehiculo: 90200, fecha_despacho: '2026-03-13T11:00:00', observaciones: null },
  { id: 8,  vehiculo_id: 3, producto_id: 6, cantidad: 1,  unidad: 'unidad',  despachado_por: 2, solicitado_por: 'Luis García',    cedula_receptor: null,            km_vehiculo: 32150, fecha_despacho: '2026-03-12T09:00:00', observaciones: 'Filtro dañado' },
  { id: 9,  vehiculo_id: 2, producto_id: 5, cantidad: 4,  unidad: 'cuartos', despachado_por: 2, solicitado_por: 'Carlos Díaz',    cedula_receptor: '001-0000003-3', km_vehiculo: 78800, fecha_despacho: '2026-03-11T10:30:00', observaciones: null },
  { id: 10, vehiculo_id: 4, producto_id: 2, cantidad: 12, unidad: 'galones', despachado_por: 2, solicitado_por: 'José Ramírez',   cedula_receptor: null,            km_vehiculo: 55350, fecha_despacho: '2026-03-10T08:45:00', observaciones: null },
]

// Consumo últimos 7 días para gráfica del dashboard
export const CONSUMO_7DIAS = [
  { fecha: '09/03', gasolina: 18, gasoil: 25 },
  { fecha: '10/03', gasolina: 22, gasoil: 12 },
  { fecha: '11/03', gasolina: 15, gasoil: 20 },
  { fecha: '12/03', gasolina: 30, gasoil: 15 },
  { fecha: '13/03', gasolina: 12, gasoil: 35 },
  { fecha: '14/03', gasolina: 18, gasoil: 15 },
  { fecha: '15/03', gasolina: 20, gasoil: 15 },
]
