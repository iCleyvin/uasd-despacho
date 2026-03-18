import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const PRIMARY = [30, 64, 175]   // blue-800
const ALT_ROW = [248, 250, 252] // slate-50

async function loadLogo() {
  try {
    const res = await fetch('/escudo.png')
    const blob = await res.blob()
    return new Promise(resolve => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    })
  } catch { return null }
}

async function crearDoc(titulo, orientacion = 'landscape') {
  const doc = new jsPDF({ orientation: orientacion, unit: 'mm', format: 'a4' })
  const fecha = new Date().toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' })
  const pageW = doc.internal.pageSize.width

  const logoData = await loadLogo()
  if (logoData) {
    doc.addImage(logoData, 'PNG', pageW - 30, 5, 22, 22)
  }

  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.text('UASD — Sistema de Despacho', 14, 14)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80)
  doc.text('Universidad Autónoma de Santo Domingo · Departamento de Suministros', 14, 20)
  doc.setTextColor(0)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(titulo, 14, 28)

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(130)
  doc.text(`Generado el ${fecha}`, 14, 34)
  doc.setTextColor(0)

  return doc
}

function tabla(doc, head, body, startY = 40) {
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
export async function exportVehiculosPDF(vehiculos) {
  const doc = await crearDoc(`Listado de Vehículos (${vehiculos.length} registros)`, 'landscape')
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
export async function exportInventarioPDF(productos) {
  const doc = await crearDoc(`Inventario de Productos (${productos.length} registros)`, 'portrait')
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
export async function exportDependenciasPDF(dependencias) {
  const doc = await crearDoc(`Dependencias (${dependencias.length} registros)`, 'portrait')
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

// ─── Auditoría ────────────────────────────────────────────────────────────────
const TABLA_LABELS_PDF = {
  despachos: 'Despachos', productos: 'Productos', vehiculos: 'Vehículos',
  dependencias: 'Dependencias', usuarios: 'Usuarios',
}

export async function exportAuditoriaPDF(rows) {
  const doc = await crearDoc(`Registro de Auditoría (${rows.length} registros)`, 'landscape')
  tabla(doc,
    ['Fecha/Hora', 'Usuario', 'Acción', 'Tabla', 'Registro ID'],
    rows.map(a => [
      a.created_at ? new Date(a.created_at).toLocaleString('es-DO') : '—',
      a.usuario_nombre ?? `#${a.usuario_id}`,
      a.accion,
      TABLA_LABELS_PDF[a.tabla] ?? a.tabla,
      `#${a.registro_id}`,
    ])
  )
  guardar(doc, 'auditoria')
}

// ─── Reportes ─────────────────────────────────────────────────────────────────
const MESES_PDF = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export async function exportReporteDiarioPDF(datos, fecha) {
  const doc = await crearDoc(`Consumo Diario — ${fecha} (${datos.length} productos)`, 'portrait')
  tabla(doc,
    ['Producto', 'Categoría', 'Total', 'Unidad'],
    datos.map(d => [d.nombre, d.categoria ?? '—', Number(d.total).toFixed(0), d.unidad])
  )
  guardar(doc, `consumo_diario_${fecha}`)
}

export async function exportReporteMensualPDF(datos, mes, año) {
  const doc = await crearDoc(`Consumo Mensual — ${MESES_PDF[mes - 1]} ${año} (${datos.length} productos)`, 'portrait')
  tabla(doc,
    ['Producto', 'Categoría', 'Total', 'Unidad', 'Nº Despachos'],
    datos.map(d => [d.nombre, d.categoria ?? '—', Number(d.total).toFixed(0), d.unidad, d.despachos])
  )
  guardar(doc, `consumo_mensual_${año}-${String(mes).padStart(2, '0')}`)
}

export async function exportReporteVehiculoPDF(datos, vehiculo, desde, hasta) {
  const titulo = vehiculo
    ? `Despachos — ${vehiculo.placa} ${vehiculo.marca} ${vehiculo.modelo} · ${desde} al ${hasta}`
    : `Despachos por Vehículo · ${desde} al ${hasta}`
  const doc = crearDoc(titulo, 'landscape')
  tabla(doc,
    ['Fecha', 'Producto', 'Cantidad', 'Unidad', 'Solicitado por'],
    datos.map(d => [
      d.fecha_despacho ? d.fecha_despacho.slice(0, 10) : '—',
      d.producto_nombre,
      Number(d.cantidad).toFixed(0),
      d.unidad,
      d.solicitado_por,
    ])
  )
  guardar(doc, `vehiculo_${vehiculo?.placa ?? 'reporte'}_${desde}_${hasta}`)
}

// ─── Despachos ────────────────────────────────────────────────────────────────
export async function exportDespachosPDF(rows) {
  const doc = await crearDoc(`Historial de Despachos (${rows.length} registros)`, 'landscape')
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
