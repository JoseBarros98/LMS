import { useState, useEffect } from 'react'
import { jwtDecode } from 'jwt-decode'
import { useAuth } from '../context/AuthContext'
import { isAdminRole } from '../utils/navigation'

export function usePermissions() {
  const { user, token } = useAuth()
  const [userPermissions, setUserPermissions] = useState({})
  const [loading, setLoading] = useState(true)

  const isAdmin = () => {
    const roleName = user?.role?.name
    if (roleName) return isAdminRole(roleName)

    if (!token) return false
    try {
      const decoded = jwtDecode(token)
      return isAdminRole(decoded.role?.name)
    } catch {
      return false
    }
  }

  useEffect(() => {
    const loadPermissions = () => {
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const decoded = jwtDecode(token)
        const permissions = user?.role?.permissions || decoded.role?.permissions || {}
        
        setUserPermissions(permissions)
      } catch (error) {
        console.error('Error decoding token:', error)
        setUserPermissions({})
      } finally {
        setLoading(false)
      }
    }

    loadPermissions()
  }, [token, user])

  const hasPermission = (resource, action) => {
    if (loading) return false

    if (isAdmin()) return true
    
    const resourcePermissions = userPermissions[resource]
    if (!resourcePermissions) return false
    
    return resourcePermissions.includes(action)
  }

  const canRead = (resource) => hasPermission(resource, 'read')
  const canCreate = (resource) => hasPermission(resource, 'create')
  const canUpdate = (resource) => hasPermission(resource, 'update')
  const canDelete = (resource) => hasPermission(resource, 'delete')
  
  // Permisos de ownership (propios)
  const canUpdateOwn = (resource) => hasPermission(resource, 'update_own')
  const canDeleteOwn = (resource) => hasPermission(resource, 'delete_own')
  const canReadOwn = (resource) => hasPermission(resource, 'read_own')
  
  // Acceso a páginas
  const canAccessPage = (pageName) => {
    if (loading) return false
    if (isAdmin()) return true
    const pages = userPermissions['pages']
    if (!Array.isArray(pages)) return false
    return pages.includes(pageName)
  }

  // Acciones específicas
  const canResolveSimulators = () => isAdmin() || hasPermission('simulators', 'resolve')

  return {
    userPermissions,
    loading,
    hasPermission,
    canRead,
    canCreate,
    canUpdate,
    canDelete,
    canUpdateOwn,
    canDeleteOwn,
    canReadOwn,
    canAccessPage,
    canResolveSimulators,
    isAdmin,
  }
}
