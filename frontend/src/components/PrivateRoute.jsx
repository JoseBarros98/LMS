import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getDefaultDashboardPath, isAdminRole } from '../utils/navigation'

function getPagesFromToken(token) {
    if (!token) return []

    try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        return payload?.role?.permissions?.pages || []
    } catch {
        return []
    }
}

export default function PrivateRoute({ children, requiredPage, adminOnly = false } ) {
    const { token, user } = useAuth()

    if (!token) {
        return <Navigate to="/login" replace />
    }

    const dashboardPath = getDefaultDashboardPath(user, token)

    if (adminOnly && !isAdminRole(user?.role?.name)) {
        return <Navigate to={dashboardPath} replace />
    }

    if (!requiredPage) {
        return children
    }

    const roleName = user?.role?.name?.toLowerCase()
    if (roleName === 'administrador') {
        return children
    }

    const pages = user?.role?.permissions?.pages || getPagesFromToken(token)
    if (Array.isArray(pages) && pages.includes(requiredPage)) {
        return children
    }

    return <Navigate to={dashboardPath} replace />
}