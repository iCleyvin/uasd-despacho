import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const PRIMARY = [30, 64, 175]   // blue-800
const ALT_ROW = [248, 250, 252] // slate-50

function crearDoc(titulo, orientacion = 'landscape') {
  const doc = new jsPDF({ orientation: orientacion, unit: 'mm', format: 'a4' })
  const fecha = new Date().toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' })

  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.text('UASD — Sistema de Despacho', 14, 18)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(titulo, 14, 26)

  doc.setFontSize(8)
  doc.setTextColor(130)
  doc.text(`Generado el ${fecha}`, 14, 33)
  doc.setTextColor(0)

  return doc
}

function tabla(doc, head, body, startY = 38) {
  autoTable(doc, {
    startY,
    head: [head],
    body,
    headStyles: { fillColor: PRIMARY, textColor: 255, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: ALT_ROW },
    styles: { fontSize: 7.5, cellPadding: 2.2, overflow: 'linebreak' },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      const pageCount = doc.internal.getNumberOfPages()
      doc.setFontSize(7)
      doc.setTextColor(150)
      doc.text(`Página ${data.pageNumber} de ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 8)
      doc.setTextColor(0)
    },
  })
}

function guardar(doc, nombre) {
  doc.save(`${nombre}_${new Date().toISOString().slice(0, 10)}.pdf`)
}

// ─── Vehículos ───────────────────────────────────────────────────────────────
export function exportVehiculosPDF(vehiculos) {
  const doc = crearDoc(`Listado de Vehículos (${vehiculos.length} registros)`, 'landscape')
  tabla(doc,
    ['Placa', 'Ficha', 'Marca', 'Modelo', 'Año', 'Tipo', 'Combustible', 'Color', 'Dependencia', 'Estado'],
    vehiculos.map(v => [
      v.placa,
      v.ficha_vieja ?? '—',
      v.marca,
      v.modelo,
      v.anio ?? '—',
      v.tipo ?? '—',
      v.combustible ?? '—',
      v.color ?? '—',
      v.dependencia_nombre ?? '—',
      v.activo ? 'Activo' : 'Inactivo',
    ])
  )
  guardar(doc, 'vehiculos')
}

// ─── Inventario ───────────────────────────────────────────────────────────────
export function exportInventarioPDF(productos) {
  const doc = crearDoc(`Inventario de Productos (${productos.length} registros)`, 'portrait')
  tabla(doc,
    ['ID', 'Nombre', 'Categoría', 'Unidad', 'Stock actual', 'Stock mínimo', 'Precio unit.', 'Estado'],
    productos.map(p => [
      p.id,
      p.nombre,
      p.categoria,
      p.unidad,
      Number(p.stock_actual).toFixed(0),
      Number(p.stock_minimo).toFixed(0),
      `$${Number(p.precio_unitario).toFixed(2)}`,
      p.activo ? 'Activo' : 'Inactivo',
    ])
  )
  guardar(doc, 'inventario')
}

// ─── Dependencias ─────────────────────────────────────────────────────────────
export function exportDependenciasPDF(dependencias) {
  const doc = crearDoc(`Dependencias (${dependencias.length} registros)`, 'portrait')
  tabla(doc,
    ['Código', 'Nombre', 'Vehículos activos', 'Estado'],
    dependencias.map(d => [
      d.codigo,
      d.nombre,
      d.vehiculos_count ?? 0,
      d.activo ? 'Activa' : 'Inactiva',
    ])
  )
  guardar(doc, 'dependencias')
}

// ─── Despachos ────────────────────────────────────────────────────────────────
export function exportDespachosPDF(rows) {
  const doc = crearDoc(`Historial de Despachos (${rows.length} registros)`, 'landscape')
  tabla(doc,
    ['#', 'Fecha', 'Placa', 'Vehículo', 'Dependencia', 'Producto', 'Cantidad', 'Receptor', 'Despachador'],
    rows.map(d => [
      String(d.id).padStart(6, '0'),
      d.fecha_despacho ? new Date(d.fecha_despacho).toLocaleString('es-DO') : '—',
      d.placa,
      `${d.marca} ${d.modelo}`,
      d.dependencia_nombre ?? '—',
      d.producto_nombre,
      `${Number(d.cantidad).toFixed(0)} ${d.unidad}`,
      d.solicitado_por,
      d.despachador_nombre ?? '—',
    ])
  )
  guardar(doc, 'despachos')
}
