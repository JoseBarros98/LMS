import { useState, useEffect } from 'react'
import { jwtDecode } from 'jwt-decode'

export function usePermissions() {
  const [userPermissions, setUserPermissions] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadPermissions = () => {
      const token = localStorage.getItem('access_token')
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const decoded = jwtDecode(token)
        
        // Extraer permisos del rol del usuario
        const permissions = decoded.role?.permissions || {}
        
        setUserPermissions(permissions)
      } catch (error) {
        console.error('Error decoding token:', error)
        setUserPermissions({})
      } finally {
        setLoading(false)
      }
    }

    loadPermissions()
  }, [])

  const hasPermission = (resource, action) => {
    if (loading) return false
    
    const resourcePermissions = userPermissions[resource]
    if (!resourcePermissions) return false
    
    return resourcePermissions.includes(action)
  }

  const canRead = (resource) => hasPermission(resource, 'read')
  const canCreate = (resource) => hasPermission(resource, 'create')
  const canUpdate = (resource) => hasPermission(resource, 'update')
  const canDelete = (resource) => hasPermission(resource, 'delete')

  return {
    userPermissions,
    loading,
    hasPermission,
    canRead,
    canCreate,
    canUpdate,
    canDelete
  }
}
