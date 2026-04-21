const ENROLLMENT_CREDENTIALS_KEY = 'plataforma_generated_credentials_v1'

const normalizeEmail = (email) => String(email || '').trim().toLowerCase()

const readCredentialsStore = () => {
  try {
    const raw = window.sessionStorage.getItem(ENROLLMENT_CREDENTIALS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

const writeCredentialsStore = (store) => {
  window.sessionStorage.setItem(ENROLLMENT_CREDENTIALS_KEY, JSON.stringify(store))
}

export const rememberGeneratedCredential = ({ email, password }) => {
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail || !password) return

  const store = readCredentialsStore()
  store[normalizedEmail] = password
  writeCredentialsStore(store)
}

export const getGeneratedCredentialByEmail = (email) => {
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) return ''
  const store = readCredentialsStore()
  return store[normalizedEmail] || ''
}
