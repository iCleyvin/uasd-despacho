import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

const hoy = () => new Date().toISOString().slice(0, 10)

// ── Paleta UASD (azul institucional) ───────────────────────────────────────
const COLOR_HEADER_BG  = '1E3A8A'   // azul oscuro
const COLOR_HEADER_FG  = 'FFFFFF'
const COLOR_ALT_ROW    = 'EFF6FF'   // azul muy claro
const COLOR_BORDER     = 'CBD5E1'   // slate-300

const BORDER_THIN = {
  top:    { style: 'thin', color: { argb: COLOR_BORDER } },
  bottom: { style: 'thin', color: { argb: COLOR_BORDER } },
  left:   { style: 'thin', color: { argb: COLOR_BORDER } },
  right:  { style: 'thin', color: { argb: COLOR_BORDER } },
}

function applyHeader(row) {
  row.eachCell(cell => {
    cell.font      = { bold: true, color: { argb: COLOR_HEADER_FG }, size: 11, name: 'Calibri' }
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_BG } }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border    = BORDER_THIN
  })
  row.height = 30
}

function applyDataRow(row, index) {
  const isAlt = index % 2 === 0
  row.eachCell({ includeEmpty: true }, cell => {
    if (isAlt) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ALT_ROW } }
    }
    cell.font      = { size: 10, name: 'Calibri' }
    cell.alignment = { vertical: 'middle', wrapText: false }
    cell.border    = BORDER_THIN
  })
  row.height = 20
}

async function downloadWorkbook(wb, filename) {
  const buffer = await wb.xlsx.writeBuffer()
  saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename)
}

function createSheet(wb, sheetName, columns, rows) {
  const ws = wb.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 1 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 }
  })

  ws.columns = columns.map(c => ({
    header: c.header,
    key:    c.key,
    width:  c.width ?? 16,
    style:  c.style ?? {},
  }))

  // Estilo cabecera
  applyHeader(ws.getRow(1))

  // Filas de datos
  rows.forEach((rowData, i) => {
    const row = ws.addRow(rowData)
    applyDataRow(row, i)
    // Alineación numérica
    columns.forEach((col, ci) => {
      if (col.numFmt) {
        const cell = row.getCell(ci + 1)
        cell.numFmt    = col.numFmt
        cell.alignment = { ...cell.alignment, horizontal: 'right' }
      }
    })
  })

  return ws
}

// ── Despachos ───────────────────────────────────────────────────────────────
export async function exportDespachosXlsx(rows) {
  const wb = new ExcelJS.Workbook()
  wb.creator  = 'UASD — Sistema de Despacho'
  wb.created  = new Date()

  const columns = [
    { header: '#',             key: 'id',          width: 8  },
    { header: 'Fecha/Hora',    key: 'fecha',        width: 20 },
    { header: 'Vehículo',      key: 'placa',        width: 12 },
    { header: 'Marca/Modelo',  key: 'vehiculo',     width: 22 },
    { header: 'Dependencia',   key: 'dependencia',  width: 22 },
    { header: 'Producto',      key: 'producto',     width: 22 },
    { header: 'Categoría',     key: 'categoria',    width: 16 },
    { header: 'Cantidad',      key: 'cantidad',     width: 12, numFmt: '#,##0.00' },
    { header: 'Unidad',        key: 'unidad',       width: 10 },
    { header: 'Solicitado por',key: 'solicitado',   width: 22 },
    { header: 'Cédula',        key: 'cedula',       width: 14 },
    { header: 'KM',            key: 'km',           width: 10, numFmt: '#,##0' },
    { header: 'Despachador',   key: 'despachador',  width: 20 },
    { header: 'Observaciones', key: 'observaciones',width: 30 },
  ]

  const data = rows.map(d => ({
    id:           d.id,
    fecha:        d.fecha_despacho ? new Date(d.fecha_despacho).toLocaleString('es-DO') : '',
    placa:        d.placa,
    vehiculo:     `${d.marca ?? ''} ${d.modelo ?? ''}`.trim(),
    dependencia:  d.dependencia_nombre ?? '',
    producto:     d.producto_nombre,
    categoria:    d.categoria,
    cantidad:     Number(d.cantidad),
    unidad:       d.unidad,
    solicitado:   d.solicitado_por,
    cedula:       d.cedula_receptor ?? '',
    km:           d.km_vehiculo ? Number(d.km_vehiculo) : '',
    despachador:  d.despachador_nombre ?? '',
    observaciones:d.observaciones ?? '',
  }))

  createSheet(wb, 'Despachos', columns, data)
  await downloadWorkbook(wb, `despachos_${hoy()}.xlsx`)
}

// ── Vehículos ────────────────────────────────────────────────────────────────
export async function exportVehiculosXlsx(vehiculos) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'UASD — Sistema de Despacho'
  wb.created = new Date()

  const columns = [
    { header: 'Ficha (Placa)', key: 'placa',       width: 14 },
    { header: 'Ficha vieja',   key: 'ficha_vieja', width: 14 },
    { header: 'Matrícula',     key: 'matricula',   width: 16 },
    { header: 'Chasis',        key: 'chasis',      width: 22 },
    { header: 'Marca',         key: 'marca',       width: 16 },
    { header: 'Modelo',        key: 'modelo',      width: 18 },
    { header: 'Año',           key: 'anio',        width: 8  },
    { header: 'Tipo',          key: 'tipo',        width: 14 },
    { header: 'Color',         key: 'color',       width: 12 },
    { header: 'Combustible',   key: 'combustible', width: 14 },
    { header: 'Dependencia',   key: 'dependencia', width: 24 },
    { header: 'Estado',        key: 'estado',      width: 10 },
  ]

  const data = vehiculos.map(v => ({
    placa:       v.placa,
    ficha_vieja: v.ficha_vieja ?? '',
    matricula:   v.matricula ?? '',
    chasis:      v.chasis ?? '',
    marca:       v.marca,
    modelo:      v.modelo,
    anio:        v.anio ?? '',
    tipo:        v.tipo ?? '',
    color:       v.color ?? '',
    combustible: v.combustible ?? '',
    dependencia: v.dependencia_nombre ?? '',
    estado:      v.activo ? 'Activo' : 'Inactivo',
  }))

  createSheet(wb, 'Vehículos', columns, data)
  await downloadWorkbook(wb, `vehiculos_${hoy()}.xlsx`)
}

// ── Inventario ───────────────────────────────────────────────────────────────
export async function exportInventarioXlsx(productos) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'UASD — Sistema de Despacho'
  wb.created = new Date()

  const columns = [
    { header: 'ID',             key: 'id',       width: 8  },
    { header: 'Nombre',         key: 'nombre',   width: 26 },
    { header: 'Categoría',      key: 'categoria',width: 18 },
    { header: 'Unidad',         key: 'unidad',   width: 12 },
    { header: 'Stock actual',   key: 'stock',    width: 14, numFmt: '#,##0.00' },
    { header: 'Stock mínimo',   key: 'minimo',   width: 14, numFmt: '#,##0.00' },
    { header: 'Precio unitario',key: 'precio',   width: 16, numFmt: '"$"#,##0.00' },
    { header: 'Estado',         key: 'estado',   width: 10 },
  ]

  const data = productos.map(p => ({
    id:       p.id,
    nombre:   p.nombre,
    categoria:p.categoria,
    unidad:   p.unidad,
    stock:    Number(p.stock_actual),
    minimo:   Number(p.stock_minimo),
    precio:   Number(p.precio_unitario),
    estado:   p.activo ? 'Activo' : 'Inactivo',
  }))

  createSheet(wb, 'Inventario', columns, data)
  await downloadWorkbook(wb, `inventario_${hoy()}.xlsx`)
}

// ── Dependencias ─────────────────────────────────────────────────────────────
export async function exportDependenciasXlsx(dependencias) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'UASD — Sistema de Despacho'
  wb.created = new Date()

  const columns = [
    { header: 'Código',          key: 'codigo',    width: 10 },
    { header: 'Nombre',          key: 'nombre',    width: 34 },
    { header: 'Vehículos',       key: 'vehiculos', width: 12, numFmt: '#,##0' },
    { header: 'Estado',          key: 'estado',    width: 12 },
  ]

  const data = dependencias.map(d => ({
    codigo:   d.codigo,
    nombre:   d.nombre,
    vehiculos:d.vehiculos_count ?? 0,
    estado:   d.activo ? 'Activa' : 'Inactiva',
  }))

  createSheet(wb, 'Dependencias', columns, data)
  await downloadWorkbook(wb, `dependencias_${hoy()}.xlsx`)
}
