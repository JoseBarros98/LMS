import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function getPagesFromToken(token) {
    if (!token) return []

    try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        return payload?.role?.permissions?.pages || []
    } catch {
        return []
    }
}

export default function PrivateRoute({ children, requiredPage } ) {
    const { token, user } = useAuth()

    if (!token) {
        return <Navigate to="/login" replace />
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

    return <Navigate to="/dashboard" replace />
}