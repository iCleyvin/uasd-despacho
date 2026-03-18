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

// ─── Ticket multi-producto (desde Nuevo Despacho) ────────────────────────────
export async function exportTicketPDF({ items, vehiculo, despachador, depTicket }) {
  const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW  = doc.internal.pageSize.width
  const pageH  = doc.internal.pageSize.height
  const first  = items[0].despacho
  const last   = items[items.length - 1].despacho

  // ── Encabezado ─────────────────────────────────────────────────────────
  const logoData = await loadLogo()
  if (logoData) doc.addImage(logoData, 'PNG', pageW - 36, 7, 22, 22)

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('UNIVERSIDAD AUTÓNOMA DE SANTO DOMINGO', 14, 16)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80)
  doc.text('Departamento de Suministros — Sistema de Despacho', 14, 22)
  doc.setTextColor(0)

  doc.setDrawColor(...PRIMARY)
  doc.setLineWidth(0.8)
  doc.line(14, 27, pageW - 14, 27)

  // ── Título ─────────────────────────────────────────────────────────────
  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...PRIMARY)
  doc.text('COMPROBANTE DE DESPACHO', pageW / 2, 36, { align: 'center' })
  doc.setTextColor(0)

  const numLabel = items.length === 1
    ? `#${String(first.id).padStart(6, '0')}`
    : `#${String(first.id).padStart(6, '0')}  —  #${String(last.id).padStart(6, '0')}`
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text(numLabel, pageW / 2, 46, { align: 'center' })

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(110)
  const fechaStr = first.fecha_despacho ? new Date(first.fecha_despacho).toLocaleString('es-DO') : '—'
  doc.text(fechaStr, pageW / 2, 52, { align: 'center' })
  doc.setTextColor(0)

  // ── Datos generales ────────────────────────────────────────────────────
  const generalDetails = [
    ['Vehículo',        `${vehiculo?.placa ?? '—'}  —  ${vehiculo?.marca ?? ''} ${vehiculo?.modelo ?? ''}`],
    ['Dependencia',     depTicket?.nombre ?? '—'],
    ['Tipo',            vehiculo?.tipo ?? '—'],
    ['Solicitado por',  first.solicitado_por ?? '—'],
    ['Despachado por',  despachador ?? '—'],
    ...(first.cedula_receptor ? [['Cédula del receptor', first.cedula_receptor]] : []),
    ...(first.km_vehiculo     ? [['Km del vehículo',     `${Number(first.km_vehiculo).toFixed(0)} km`]] : []),
    ...(first.observaciones   ? [['Observaciones',        first.observaciones]] : []),
  ]

  autoTable(doc, {
    startY: 58,
    body: generalDetails,
    theme: 'plain',
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 52, fillColor: [241, 245, 249], textColor: 60 },
      1: { cellWidth: 'auto' },
    },
    styles: { fontSize: 10, cellPadding: { top: 3.5, bottom: 3.5, left: 5, right: 5 } },
    margin: { left: 14, right: 14 },
  })

  // ── Tabla de productos ─────────────────────────────────────────────────
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 6,
    head: [['Producto', 'Cantidad', 'Unidad', 'N° Despacho']],
    body: items.map(({ despacho, producto }) => [
      producto?.nombre ?? '—',
      Number(despacho.cantidad).toFixed(0),
      despacho.unidad,
      `#${String(despacho.id).padStart(6, '0')}`,
    ]),
    headStyles: { fillColor: PRIMARY, textColor: 255, fontStyle: 'bold', fontSize: 9 },
    styles: { fontSize: 10, cellPadding: 3.5 },
    columnStyles: {
      1: { halign: 'right' },
      3: { font: 'courier', fontSize: 9 },
    },
    margin: { left: 14, right: 14 },
  })

  // ── Áreas de firma ─────────────────────────────────────────────────────
  const sigY = doc.lastAutoTable.finalY + 28
  const col  = (pageW - 28) / 2
  const lx   = 14
  const rx   = 14 + col + 14

  doc.setDrawColor(100)
  doc.setLineWidth(0.5)
  doc.line(lx, sigY, lx + col, sigY)
  doc.line(rx, sigY, rx + col, sigY)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Despachador',              lx + col / 2, sigY + 6,  { align: 'center' })
  doc.text('Receptor / Solicitante',   rx + col / 2, sigY + 6,  { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(110)
  doc.text(despachador ?? '',          lx + col / 2, sigY + 11, { align: 'center' })
  doc.text('Firma y sello',            lx + col / 2, sigY + 16, { align: 'center' })
  doc.text(first.solicitado_por ?? '', rx + col / 2, sigY + 11, { align: 'center' })
  doc.text('Firma y número de cédula', rx + col / 2, sigY + 16, { align: 'center' })
  doc.setTextColor(0)

  // ── Pie ────────────────────────────────────────────────────────────────
  doc.setFontSize(7)
  doc.setTextColor(160)
  doc.text(
    'Este documento es un comprobante oficial de despacho · UASD — Departamento de Suministros',
    pageW / 2, pageH - 10, { align: 'center' }
  )

  const prefix = items.length === 1
    ? String(first.id).padStart(6, '0')
    : `${String(first.id).padStart(6, '0')}-${String(last.id).padStart(6, '0')}`
  doc.save(`despacho_${prefix}.pdf`)
}

// ─── Comprobante individual ───────────────────────────────────────────────────
const CATEGORIA_LABELS_PDF = {
  combustible:        'Combustible',
  aceite_motor:       'Aceite de motor',
  aceite_transmision: 'Aceite de transmisión',
  repuesto:           'Repuesto',
  otro:               'Otro',
}

export async function exportDespachoIndividualPDF(d) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.width   // 210 mm
  const pageH = doc.internal.pageSize.height  // 297 mm

  // ── Encabezado ───────────────────────────────────────────────────────────
  const logoData = await loadLogo()
  if (logoData) {
    doc.addImage(logoData, 'PNG', pageW - 36, 7, 22, 22)
  }

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('UNIVERSIDAD AUTÓNOMA DE SANTO DOMINGO', 14, 16)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80)
  doc.text('Departamento de Suministros — Sistema de Despacho', 14, 22)
  doc.setTextColor(0)

  // Línea divisoria azul
  doc.setDrawColor(...PRIMARY)
  doc.setLineWidth(0.8)
  doc.line(14, 27, pageW - 14, 27)

  // ── Título y número ──────────────────────────────────────────────────────
  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...PRIMARY)
  doc.text('COMPROBANTE DE DESPACHO', pageW / 2, 36, { align: 'center' })
  doc.setTextColor(0)

  // Aviso: copia para uso interno
  const bannerW = 142
  const bannerX = (pageW - bannerW) / 2
  doc.setFillColor(241, 245, 249)
  doc.roundedRect(bannerX, 39, bannerW, 7, 1.5, 1.5, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(80)
  doc.text('COPIA PARA USO INTERNO — DEPARTAMENTO DE SUMINISTROS', pageW / 2, 44, { align: 'center' })
  doc.setTextColor(0)

  doc.setFontSize(26)
  doc.setFont('helvetica', 'bold')
  doc.text(`#${String(d.id).padStart(6, '0')}`, pageW / 2, 56, { align: 'center' })

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(110)
  const fechaStr = d.fecha_despacho ? new Date(d.fecha_despacho).toLocaleString('es-DO') : '—'
  doc.text(fechaStr, pageW / 2, 63, { align: 'center' })
  doc.setTextColor(0)

  // ── Tabla de detalles ────────────────────────────────────────────────────
  const details = [
    ['Vehículo',             `${d.placa}  —  ${d.marca} ${d.modelo}`],
    ['Dependencia',          d.dependencia_nombre ?? '—'],
    ['Tipo de vehículo',     d.vehiculo_tipo ?? '—'],
    ['Producto',             d.producto_nombre ?? '—'],
    ['Categoría',            CATEGORIA_LABELS_PDF[d.categoria] ?? d.categoria ?? '—'],
    ['Cantidad despachada',  `${Number(d.cantidad).toFixed(0)} ${d.unidad}`],
    ['Solicitado por',       d.solicitado_por ?? '—'],
    ['Despachado por',       d.despachador_nombre ?? '—'],
    ...(d.cedula_receptor ? [['Cédula del receptor', d.cedula_receptor]]                      : []),
    ...(d.km_vehiculo     ? [['Km del vehículo',     `${Number(d.km_vehiculo).toFixed(0)} km`]] : []),
    ...(d.observaciones   ? [['Observaciones',        d.observaciones]]                        : []),
  ]

  autoTable(doc, {
    startY: 69,
    body: details,
    theme: 'plain',
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 58, fillColor: [241, 245, 249], textColor: 60 },
      1: { cellWidth: 'auto' },
    },
    styles: { fontSize: 10.5, cellPadding: { top: 4, bottom: 4, left: 5, right: 5 } },
    margin: { left: 14, right: 14 },
  })

  // ── Áreas de firma ───────────────────────────────────────────────────────
  const finalY = doc.lastAutoTable.finalY
  const sigY   = finalY + 28
  const col    = (pageW - 28) / 2   // ancho de cada columna
  const lx     = 14                  // x columna izquierda
  const rx     = 14 + col + 14       // x columna derecha

  doc.setDrawColor(100)
  doc.setLineWidth(0.5)

  // Línea izquierda
  doc.line(lx, sigY, lx + col, sigY)
  // Línea derecha
  doc.line(rx, sigY, rx + col, sigY)

  // Etiquetas
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Despachador', lx + col / 2, sigY + 6, { align: 'center' })
  doc.text('Receptor / Solicitante', rx + col / 2, sigY + 6, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(110)
  doc.text(d.despachador_nombre ?? '', lx + col / 2, sigY + 11, { align: 'center' })
  doc.text('Firma y sello',           lx + col / 2, sigY + 16, { align: 'center' })

  doc.text(d.solicitado_por ?? '',       rx + col / 2, sigY + 11, { align: 'center' })
  doc.text('Firma y número de cédula',  rx + col / 2, sigY + 16, { align: 'center' })
  doc.setTextColor(0)

  // ── Pie de página ────────────────────────────────────────────────────────
  doc.setFontSize(7)
  doc.setTextColor(160)
  doc.text(
    'Copia para uso interno · Departamento de Suministros · UASD — Prohibida su circulación externa',
    pageW / 2, pageH - 10, { align: 'center' }
  )

  doc.save(`despacho_${String(d.id).padStart(6, '0')}.pdf`)
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

// ─── Historial combinado de movimientos ───────────────────────────────────────
export async function exportMovimientosPDF(rows) {
  const doc = await crearDoc(`Historial de Movimientos (${rows.length} registros)`, 'landscape')
  tabla(doc,
    ['Fecha', 'Tipo', 'Producto', 'Cantidad', 'Unidad', 'Stock antes', 'Stock después', 'Vehículo', 'Usuario'],
    rows.map(r => [
      r.fecha ? new Date(r.fecha).toLocaleString('es-DO') : '—',
      r.tipo === 'entrada' ? 'Entrada' : 'Despacho',
      r.producto_nombre ?? '—',
      Number(r.cantidad).toFixed(0),
      r.unidad ?? '',
      r.stock_antes  != null ? Number(r.stock_antes).toFixed(0)  : '—',
      r.stock_despues != null ? Number(r.stock_despues).toFixed(0) : '—',
      r.vehiculo_placa ?? '—',
      r.usuario_nombre ?? '—',
    ])
  )
  guardar(doc, 'movimientos')
}

// ─── Comprobante de movimiento de inventario ──────────────────────────────────
const TIPO_LABELS = { entrada: 'ENTRADA DE INVENTARIO', despacho: 'DESPACHO DE COMBUSTIBLE / SUMINISTRO' }

export async function exportMovimientoPDF(m) {
  const doc   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.width
  const pageH = doc.internal.pageSize.height
  const esEntrada = m.tipo === 'entrada'

  // ── Encabezado ───────────────────────────────────────────────────────────
  const logoData = await loadLogo()
  if (logoData) doc.addImage(logoData, 'PNG', pageW - 36, 7, 22, 22)

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('UNIVERSIDAD AUTÓNOMA DE SANTO DOMINGO', 14, 16)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80)
  doc.text('Departamento de Suministros — Sistema de Despacho', 14, 22)
  doc.setTextColor(0)

  doc.setDrawColor(...PRIMARY)
  doc.setLineWidth(0.8)
  doc.line(14, 27, pageW - 14, 27)

  // ── Título ───────────────────────────────────────────────────────────────
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...PRIMARY)
  doc.text(TIPO_LABELS[m.tipo] ?? 'MOVIMIENTO DE INVENTARIO', pageW / 2, 36, { align: 'center' })
  doc.setTextColor(0)

  // Aviso: copia para uso interno
  const bannerW = 142
  const bannerX = (pageW - bannerW) / 2
  doc.setFillColor(241, 245, 249)
  doc.roundedRect(bannerX, 39, bannerW, 7, 1.5, 1.5, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(80)
  doc.text('COPIA PARA USO INTERNO — DEPARTAMENTO DE SUMINISTROS', pageW / 2, 44, { align: 'center' })
  doc.setTextColor(0)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(110)
  const fechaStr = m.fecha ? new Date(m.fecha).toLocaleString('es-DO') : '—'
  doc.text(fechaStr, pageW / 2, 53, { align: 'center' })
  doc.setTextColor(0)

  // ── Tabla de detalles ────────────────────────────────────────────────────
  const details = [
    ['Producto',   m.producto_nombre ?? '—'],
    ['Tipo',       esEntrada ? 'Entrada de inventario' : 'Despacho'],
    ['Cantidad',   `${Number(m.cantidad).toFixed(0)} ${m.unidad}`],
    ...(esEntrada
      ? [
          ['Stock anterior',  m.stock_antes  != null ? `${Number(m.stock_antes).toFixed(0)} ${m.unidad}`  : '—'],
          ['Stock después',   m.stock_despues != null ? `${Number(m.stock_despues).toFixed(0)} ${m.unidad}` : '—'],
        ]
      : [
          ['Vehículo',        m.vehiculo_placa ?? '—'],
          ['Solicitado por',  m.solicitado_por ?? '—'],
        ]),
    ['Registrado por', m.usuario_nombre ?? '—'],
    ...(m.notas ? [['Notas / Observaciones', m.notas]] : []),
  ]

  autoTable(doc, {
    startY: 59,
    body: details,
    theme: 'plain',
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 58, fillColor: [241, 245, 249], textColor: 60 },
      1: { cellWidth: 'auto' },
    },
    styles: { fontSize: 10.5, cellPadding: { top: 4, bottom: 4, left: 5, right: 5 } },
    margin: { left: 14, right: 14 },
  })

  // ── Área de firma (solo para despachos) ─────────────────────────────────
  if (!esEntrada) {
    const finalY = doc.lastAutoTable.finalY
    const sigY   = finalY + 28
    const col    = (pageW - 28) / 2
    const lx     = 14
    const rx     = 14 + col + 14

    doc.setDrawColor(100)
    doc.setLineWidth(0.5)
    doc.line(lx, sigY, lx + col, sigY)
    doc.line(rx, sigY, rx + col, sigY)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Despachador', lx + col / 2, sigY + 6, { align: 'center' })
    doc.text('Receptor / Solicitante', rx + col / 2, sigY + 6, { align: 'center' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(110)
    doc.text(m.usuario_nombre ?? '', lx + col / 2, sigY + 11, { align: 'center' })
    doc.text('Firma y sello', lx + col / 2, sigY + 16, { align: 'center' })
    doc.text(m.solicitado_por ?? '', rx + col / 2, sigY + 11, { align: 'center' })
    doc.text('Firma y número de cédula', rx + col / 2, sigY + 16, { align: 'center' })
    doc.setTextColor(0)
  }

  // ── Pie de página ────────────────────────────────────────────────────────
  doc.setFontSize(7)
  doc.setTextColor(160)
  doc.text(
    'Copia para uso interno · Departamento de Suministros · UASD — Prohibida su circulación externa',
    pageW / 2, pageH - 10, { align: 'center' }
  )

  const tipo  = m.tipo === 'entrada' ? 'entrada' : 'despacho'
  const fecha = (m.fecha ?? '').slice(0, 10).replace(/-/g, '')
  doc.save(`${tipo}_${fecha}_${String(m.id).padStart(6, '0')}.pdf`)
}
