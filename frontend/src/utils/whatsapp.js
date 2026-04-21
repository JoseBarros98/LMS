const WHATSAPP_TEMPLATES_STORAGE_KEY = 'plataforma_whatsapp_templates_v1'

const DEFAULT_WHATSAPP_TEMPLATES = {
  curso: [
    'Hola {{student_name}}, te damos la bienvenida a Plataforma.',
    'Tu matricula en el curso {{source_title}} fue registrada correctamente.',
    'Enlace de la plataforma: {{platform_url}}',
    'Usuario/correo: {{user_email}}',
    'Contrasena temporal: {{generated_password}}',
  ].join('\n'),
  ruta: [
    'Hola {{student_name}}, te damos la bienvenida a Plataforma.',
    'Tu matricula en la ruta {{source_title}} fue registrada correctamente.',
    'Enlace de la plataforma: {{platform_url}}',
    'Usuario/correo: {{user_email}}',
    'Contrasena temporal: {{generated_password}}',
  ].join('\n'),
}

const normalizeWhatsappPhone = (phoneNumber) => {
  if (!phoneNumber) return ''

  const digits = String(phoneNumber).replace(/[^\d]/g, '')
  if (digits.length === 8) {
    return `591${digits}`
  }

  return digits
}

const fillTemplate = (template, variables) => {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const value = variables[key]
    return value == null ? '' : String(value)
  })
}

export const getDefaultWhatsappTemplates = () => ({ ...DEFAULT_WHATSAPP_TEMPLATES })

export const getWhatsappTemplates = () => {
  try {
    const raw = window.localStorage.getItem(WHATSAPP_TEMPLATES_STORAGE_KEY)
    if (!raw) return getDefaultWhatsappTemplates()
    const parsed = JSON.parse(raw)
    return {
      ...DEFAULT_WHATSAPP_TEMPLATES,
      ...(parsed && typeof parsed === 'object' ? parsed : {}),
    }
  } catch {
    return getDefaultWhatsappTemplates()
  }
}

export const saveWhatsappTemplates = (templates) => {
  const next = {
    ...DEFAULT_WHATSAPP_TEMPLATES,
    ...(templates && typeof templates === 'object' ? templates : {}),
  }
  window.localStorage.setItem(WHATSAPP_TEMPLATES_STORAGE_KEY, JSON.stringify(next))
  return next
}

export const buildEnrollmentWhatsappLink = ({
  phoneNumber,
  studentName,
  sourceTitle,
  sourceType,
  userEmail,
  generatedPassword,
  platformUrl,
}) => {
  const normalizedPhone = normalizeWhatsappPhone(phoneNumber)
  if (!normalizedPhone) return null

  const templateType = sourceType === 'ruta' ? 'ruta' : 'curso'
  const templates = getWhatsappTemplates()
  const template = templates[templateType] || DEFAULT_WHATSAPP_TEMPLATES[templateType]
  const message = fillTemplate(template, {
    student_name: studentName || 'estudiante',
    source_title: sourceTitle || '',
    source_type: templateType,
    platform_url: platformUrl || window.location.origin,
    user_email: userEmail || '',
    generated_password: generatedPassword || '',
  })

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message.trim())}`
}