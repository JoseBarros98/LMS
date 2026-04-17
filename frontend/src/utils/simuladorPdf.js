import { jsPDF } from 'jspdf'

const PAGE = {
  width: 210,
  height: 297,
  marginX: 16,
  marginTop: 18,
  marginBottom: 16,
}

const COLORS = {
  ink: [31, 41, 55],
  muted: [107, 114, 128],
  brand: [37, 99, 235],
  brandSoft: [219, 234, 254],
  success: [5, 150, 105],
  successSoft: [220, 252, 231],
  danger: [220, 38, 38],
  dangerSoft: [254, 226, 226],
  panel: [248, 250, 252],
  border: [226, 232, 240],
}

function applyTextColor(doc, rgb) {
  doc.setTextColor(rgb[0], rgb[1], rgb[2])
}

function applyFillColor(doc, rgb) {
  doc.setFillColor(rgb[0], rgb[1], rgb[2])
}

function applyDrawColor(doc, rgb) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2])
}

function formatDuration(seconds) {
  if (!seconds) return '0m 0s'
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}m ${remainingSeconds}s`
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatDateTime(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function splitText(doc, text, maxWidth) {
  return doc.splitTextToSize(String(text || '-'), maxWidth)
}

function ensurePage(doc, y, requiredHeight) {
  if (y + requiredHeight <= PAGE.height - PAGE.marginBottom) {
    return y
  }

  doc.addPage()
  return PAGE.marginTop
}

function drawWrappedText(doc, lines, x, y, lineHeight = 5) {
  doc.text(lines, x, y)
  return y + lines.length * lineHeight
}

function drawLabelValue(doc, label, value, y) {
  const valueX = PAGE.marginX + 46

  doc.setFont('helvetica', 'bold')
  applyTextColor(doc, COLORS.ink)
  doc.text(label, PAGE.marginX, y)
  doc.setFont('helvetica', 'normal')
  applyTextColor(doc, COLORS.muted)
  doc.text(String(value || '-'), valueX, y)
  return y + 7
}

function drawSummaryCard(doc, title, value, subtitle, x, y, width, tone) {
  const fill = tone === 'success' ? COLORS.successSoft : tone === 'danger' ? COLORS.dangerSoft : COLORS.brandSoft
  const text = tone === 'success' ? COLORS.success : tone === 'danger' ? COLORS.danger : COLORS.brand

  applyFillColor(doc, fill)
  doc.roundedRect(x, y, width, 20, 4, 4, 'F')
  doc.setFont('helvetica', 'bold')
  applyTextColor(doc, text)
  doc.setFontSize(14)
  doc.text(String(value), x + 4, y + 8)
  doc.setFontSize(9)
  doc.text(title, x + 4, y + 13)
  doc.setFont('helvetica', 'normal')
  applyTextColor(doc, COLORS.muted)
  doc.text(subtitle, x + 4, y + 17)
}

async function blobToDataUrl(blob) {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

async function loadImageElement(dataUrl) {
  return await new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = dataUrl
  })
}

function buildImageCandidates(url) {
  if (!url) return []

  const unique = new Set()
  const pushCandidate = (candidate) => {
    if (!candidate) return
    unique.add(candidate)
  }

  pushCandidate(url)

  if (String(url).startsWith('/media/')) {
    pushCandidate(`${window.location.origin}${url}`)
    pushCandidate(`http://localhost:8000${url}`)
  }

  try {
    const parsed = new URL(url)
    if (parsed.pathname.startsWith('/media/')) {
      pushCandidate(parsed.pathname)
      pushCandidate(`${window.location.origin}${parsed.pathname}`)
    }
  } catch {
    // Not an absolute URL.
  }

  return Array.from(unique)
}

async function loadImageFromUrl(url) {
  const candidates = buildImageCandidates(url)
  let lastError = null

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, { method: 'GET' })
      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status}`)
        continue
      }
      const blob = await response.blob()
      if (!blob || blob.size === 0) {
        lastError = new Error('Imagen vacía.')
        continue
      }
      return await blobToDataUrl(blob)
    } catch (error) {
      lastError = error
    }
  }

  throw lastError || new Error('No se pudo descargar la imagen de explicación.')
}

async function normalizeImageForPdf(dataUrl) {
  const image = await loadImageElement(dataUrl)
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth || image.width
  canvas.height = image.naturalHeight || image.height

  const context = canvas.getContext('2d')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, 0, 0)

  return {
    dataUrl: canvas.toDataURL('image/jpeg', 0.92),
    width: canvas.width,
    height: canvas.height,
  }
}

function buildSafeTitle(rawTitle) {
  return String(rawTitle || 'simulador')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .trim()
    .replace(/\s+/g, '_')
}

export async function generateSimuladorResolutionPdf(intento) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = PAGE.width - PAGE.marginX * 2
  const respuestas = [...(intento?.respuestas || [])].sort((left, right) => left.pregunta_orden - right.pregunta_orden)

  const studentName = intento?.user_nombre || intento?.user_email || 'Estudiante'
  const courseName = intento?.simulador_curso_nombre || '-'
  const routeName = intento?.simulador_ruta_nombre || '-'
  const totalPreguntas = respuestas.length
  const totalCorrectas = intento?.total_correctas || 0
  const totalIncorrectas = intento?.total_incorrectas || 0
  const totalNoRespondidas = intento?.total_no_respondidas || 0
  const porcentaje = totalPreguntas > 0
    ? Math.round((totalCorrectas / totalPreguntas) * 100)
    : 0

  // Portada formal
  applyFillColor(doc, COLORS.brandSoft)
  doc.roundedRect(PAGE.marginX, PAGE.marginTop, pageWidth, 64, 6, 6, 'F')
  applyDrawColor(doc, COLORS.brand)
  doc.setLineWidth(0.6)
  doc.roundedRect(PAGE.marginX, PAGE.marginTop, pageWidth, 64, 6, 6)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(24)
  applyTextColor(doc, COLORS.ink)
  doc.text('Resolución del Examen', PAGE.marginX + 8, PAGE.marginTop + 18)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  applyTextColor(doc, COLORS.muted)
  doc.text(intento?.simulador_titulo || 'Simulador', PAGE.marginX + 8, PAGE.marginTop + 28)

  applyFillColor(doc, COLORS.panel)
  doc.roundedRect(PAGE.marginX, PAGE.marginTop + 70, pageWidth, 64, 4, 4, 'F')

  let coverY = PAGE.marginTop + 80
  coverY = drawLabelValue(doc, 'Estudiante:', studentName, coverY)
  coverY = drawLabelValue(doc, 'Curso:', courseName, coverY)
  coverY = drawLabelValue(doc, 'Ruta:', routeName, coverY)
  coverY = drawLabelValue(doc, 'Fecha de emisión:', formatDate(new Date()), coverY)
  coverY = drawLabelValue(doc, 'Inicio:', formatDateTime(intento?.iniciado_en), coverY)
  coverY = drawLabelValue(doc, 'Finalización:', formatDateTime(intento?.finalizado_en), coverY)
  coverY = drawLabelValue(doc, 'Tiempo:', formatDuration(intento?.tiempo_transcurrido_segundos), coverY)
  coverY = drawLabelValue(doc, 'Puntaje:', intento?.puntaje_obtenido, coverY)

  coverY += 10
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  applyTextColor(doc, COLORS.ink)
  doc.text('Resumen general', PAGE.marginX, coverY)

  const cardWidth = (pageWidth - 9) / 4
  drawSummaryCard(doc, 'Correctas', totalCorrectas, `de ${totalPreguntas}`, PAGE.marginX, coverY + 6, cardWidth, 'success')
  drawSummaryCard(doc, 'Incorrectas', totalIncorrectas, `de ${totalPreguntas}`, PAGE.marginX + cardWidth + 3, coverY + 6, cardWidth, 'danger')
  drawSummaryCard(doc, 'Sin responder', totalNoRespondidas, `de ${totalPreguntas}`, PAGE.marginX + (cardWidth + 3) * 2, coverY + 6, cardWidth, 'neutral')
  drawSummaryCard(doc, 'Efectividad', `${porcentaje}%`, 'global', PAGE.marginX + (cardWidth + 3) * 3, coverY + 6, cardWidth, 'neutral')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  applyTextColor(doc, COLORS.muted)
  doc.text('Documento generado automáticamente por la plataforma.', PAGE.marginX, PAGE.height - PAGE.marginBottom)

  // Página de detalle
  doc.addPage()
  let y = PAGE.marginTop

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  applyTextColor(doc, COLORS.ink)
  doc.text('Preguntas, respuestas y explicaciones', PAGE.marginX, y)
  y += 10

  for (let index = 0; index < respuestas.length; index += 1) {
    const respuesta = respuestas[index]
    const preguntaLines = splitText(doc, `${index + 1}. ${respuesta.pregunta_texto}`, pageWidth - 10)
    const correcta = respuesta?.opcion_correcta?.texto || '-'
    const elegida = respuesta?.opcion_texto || 'No respondida'
    const explicacion = respuesta?.explicacion?.texto || 'Sin explicación registrada.'
    const explicacionImagenUrl = respuesta?.explicacion?.imagen_url || null
    const correctaLines = splitText(doc, correcta, pageWidth - 18)
    const elegidaLines = splitText(doc, elegida, pageWidth - 18)
    const explicacionLines = splitText(doc, explicacion, pageWidth - 10)

    const headerHeight = 10 + preguntaLines.length * 4.8
    const answerHeight = 18 + Math.max(correctaLines.length, elegidaLines.length) * 4.8

    let normalizedImage = null
    let imageRenderHeight = 0

    if (explicacionImagenUrl) {
      try {
        const rawDataUrl = await loadImageFromUrl(explicacionImagenUrl)
        normalizedImage = await normalizeImageForPdf(rawDataUrl)
        const maxImageWidth = pageWidth - 10
        const maxImageHeight = 90
        const ratio = normalizedImage.width > 0 ? normalizedImage.height / normalizedImage.width : 1
        imageRenderHeight = Math.max(22, Math.min(maxImageWidth * ratio, maxImageHeight))
      } catch {
        normalizedImage = null
      }
    }

    const explanationHeight = 14 + explicacionLines.length * 4.8 + (normalizedImage ? imageRenderHeight + 6 : 0)
    const blockHeight = headerHeight + answerHeight + explanationHeight + 8

    y = ensurePage(doc, y, blockHeight)

    applyDrawColor(doc, COLORS.border)
    doc.setLineWidth(0.3)
    doc.roundedRect(PAGE.marginX, y, pageWidth, blockHeight, 4, 4)

    applyFillColor(doc, COLORS.panel)
    doc.roundedRect(PAGE.marginX, y, pageWidth, headerHeight, 4, 4, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    applyTextColor(doc, COLORS.ink)
    drawWrappedText(doc, preguntaLines, PAGE.marginX + 5, y + 7)

    let innerY = y + headerHeight + 6
    const columnWidth = (pageWidth - 18) / 2

    applyFillColor(doc, respuesta.es_correcta ? COLORS.successSoft : COLORS.dangerSoft)
    doc.roundedRect(PAGE.marginX + 5, innerY, columnWidth, answerHeight - 8, 3, 3, 'F')
    applyFillColor(doc, COLORS.successSoft)
    doc.roundedRect(PAGE.marginX + 10 + columnWidth, innerY, columnWidth, answerHeight - 8, 3, 3, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    applyTextColor(doc, COLORS.muted)
    doc.text('Tu respuesta', PAGE.marginX + 9, innerY + 5)
    doc.text('Respuesta correcta', PAGE.marginX + 14 + columnWidth, innerY + 5)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    applyTextColor(doc, respuesta.es_correcta ? COLORS.success : COLORS.danger)
    drawWrappedText(doc, elegidaLines, PAGE.marginX + 9, innerY + 11)
    applyTextColor(doc, COLORS.success)
    drawWrappedText(doc, correctaLines, PAGE.marginX + 14 + columnWidth, innerY + 11)

    innerY += answerHeight

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    applyTextColor(doc, COLORS.brand)
    doc.text('Explicación', PAGE.marginX + 5, innerY)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    applyTextColor(doc, COLORS.ink)
    const explanationEndY = drawWrappedText(doc, explicacionLines, PAGE.marginX + 5, innerY + 6)

    if (normalizedImage) {
      const imageX = PAGE.marginX + 5
      const imageY = explanationEndY + 2
      const imageWidth = pageWidth - 10

      applyDrawColor(doc, COLORS.border)
      doc.setLineWidth(0.25)
      doc.roundedRect(imageX - 1, imageY - 1, imageWidth + 2, imageRenderHeight + 2, 2, 2)
      doc.addImage(normalizedImage.dataUrl, 'JPEG', imageX, imageY, imageWidth, imageRenderHeight)
    }

    y += blockHeight + 6
  }

  const safeTitle = buildSafeTitle(intento?.simulador_titulo || 'simulador')
  const fileName = `resolucion_${safeTitle}_${formatDate(new Date()).replace(/\//g, '-')}.pdf`

  return {
    blob: doc.output('blob'),
    fileName,
  }
}
