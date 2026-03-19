import * as XLSX from 'xlsx'

const hoy = () => new Date().toISOString().slice(0, 10)

function workbook(sheetName, headers, rows) {
  const data = [headers, ...rows]
  const ws = XLSX.utils.aoa_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  return wb
}

function download(wb, filename) {
  XLSX.writeFile(wb, filename)
}

export function exportDespachosXlsx(rows) {
  const headers = ['#', 'Fecha/Hora', 'Vehículo', 'Marca/Modelo', 'Producto', 'Categoría', 'Cantidad', 'Unidad', 'Solicitado por', 'Cédula', 'KM', 'Despachador', 'Observaciones']
  const data = rows.map(d => [
    d.id,
    d.fecha_despacho ? new Date(d.fecha_despacho).toLocaleString('es-DO') : '',
    d.placa,
    `${d.marca ?? ''} ${d.modelo ?? ''}`.trim(),
    d.producto_nombre,
    d.categoria,
    Number(d.cantidad),
    d.unidad,
    d.solicitado_por,
    d.cedula_receptor ?? '',
    d.km_vehiculo ?? '',
    d.despachador_nombre ?? '',
    d.observaciones ?? '',
  ])
  download(workbook('Despachos', headers, data), `despachos_${hoy()}.xlsx`)
}

export function exportVehiculosXlsx(vehiculos) {
  const headers = ['Ficha', 'Ficha vieja', 'Matrícula', 'Chasis', 'Marca', 'Modelo', 'Año', 'Tipo', 'Color', 'Combustible', 'Dependencia', 'Estado']
  const data = vehiculos.map(v => [
    v.placa, v.ficha_vieja ?? '', v.matricula ?? '', v.chasis ?? '',
    v.marca, v.modelo, v.anio, v.tipo, v.color, v.combustible,
    v.dependencia_nombre ?? '', v.activo ? 'Activo' : 'Inactivo',
  ])
  download(workbook('Vehículos', headers, data), `vehiculos_${hoy()}.xlsx`)
}

export function exportInventarioXlsx(productos) {
  const headers = ['ID', 'Nombre', 'Categoría', 'Unidad', 'Stock actual', 'Stock mínimo', 'Precio unitario', 'Estado']
  const data = productos.map(p => [
    p.id, p.nombre, p.categoria, p.unidad,
    Number(p.stock_actual), Number(p.stock_minimo), Number(p.precio_unitario),
    p.activo ? 'Activo' : 'Inactivo',
  ])
  download(workbook('Inventario', headers, data), `inventario_${hoy()}.xlsx`)
}

export function exportDependenciasXlsx(dependencias) {
  const headers = ['Código', 'Nombre', 'Vehículos activos', 'Estado']
  const data = dependencias.map(d => [
    d.codigo, d.nombre, d.vehiculos_count ?? 0, d.activo ? 'Activa' : 'Inactiva',
  ])
  download(workbook('Dependencias', headers, data), `dependencias_${hoy()}.xlsx`)
}
