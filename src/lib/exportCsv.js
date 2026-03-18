function download(filename, headers, rows) {
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`
  const fecha = new Date().toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' })
  const meta = [
    '"UNIVERSIDAD AUTÓNOMA DE SANTO DOMINGO (UASD)"',
    '"Sistema de Despacho — Departamento de Suministros"',
    `"Generado el: ${fecha}"`,
    '',
  ]
  const lines = [...meta, headers.join(','), ...rows.map(r => r.map(esc).join(','))]
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const hoy = () => new Date().toISOString().slice(0, 10)

export function exportVehiculosCSV(vehiculos) {
  download(
    `vehiculos_${hoy()}.csv`,
    ['Placa', 'Ficha', 'Marca', 'Modelo', 'Año', 'Tipo', 'Color', 'Combustible', 'Matrícula', 'Chasis', 'Dependencia', 'Estado'],
    vehiculos.map(v => [v.placa, v.ficha_vieja, v.marca, v.modelo, v.anio, v.tipo, v.color, v.combustible, v.matricula, v.chasis, v.dependencia_nombre, v.activo ? 'Activo' : 'Inactivo'])
  )
}

export function exportInventarioCSV(productos) {
  download(
    `inventario_${hoy()}.csv`,
    ['ID', 'Nombre', 'Categoría', 'Unidad', 'Stock actual', 'Stock mínimo', 'Precio unitario', 'Estado'],
    productos.map(p => [p.id, p.nombre, p.categoria, p.unidad, p.stock_actual, p.stock_minimo, p.precio_unitario, p.activo ? 'Activo' : 'Inactivo'])
  )
}

export function exportMovimientosCSV(rows) {
  download(
    `movimientos_${hoy()}.csv`,
    ['Fecha', 'Tipo', 'Producto', 'Cantidad', 'Unidad', 'Stock antes', 'Stock después', 'Vehículo', 'Solicitado por', 'Registrado por', 'Notas'],
    rows.map(r => [
      r.fecha ? new Date(r.fecha).toLocaleString('es-DO') : '',
      r.tipo === 'entrada' ? 'Entrada' : 'Despacho',
      r.producto_nombre,
      r.cantidad,
      r.unidad,
      r.stock_antes ?? '',
      r.stock_despues ?? '',
      r.vehiculo_placa ?? '',
      r.solicitado_por ?? '',
      r.usuario_nombre ?? '',
      r.notas ?? '',
    ])
  )
}

export function exportDependenciasCSV(dependencias) {
  download(
    `dependencias_${hoy()}.csv`,
    ['Código', 'Nombre', 'Vehículos activos', 'Estado'],
    dependencias.map(d => [d.codigo, d.nombre, d.vehiculos_count ?? 0, d.activo ? 'Activa' : 'Inactiva'])
  )
}
