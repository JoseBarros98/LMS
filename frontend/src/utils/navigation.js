export function isAdminRole(roleName) {
  return String(roleName || '').toLowerCase() === 'administrador'
}

export function getRoleNameFromToken(token) {
  if (!token) return ''

  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload?.role?.name || ''
  } catch {
    return ''
  }
}

export function getDefaultDashboardPath(user, token) {
  const roleName = user?.role?.name || getRoleNameFromToken(token)
  return isAdminRole(roleName) ? '/admin/dashboard' : '/dashboard'
}