import { createContext, useContext, useEffect, useState } from 'react'
import { login as loginApi } from '../api/auth'
import { fetchMe } from '../api/auth'

const AuthContext = createContext()

export function AuthProvider ({ children }) {
    const [user, setUser] = useState(() => {
        const stored = localStorage.getItem('user')
        return stored ? JSON.parse(stored) : null
    })

    const [token, setToken] = useState(() => localStorage.getItem('access_token') || null)

    const login = async (email, password) => {
        try {
            const res = await loginApi(email, password)
            const { access, refresh } = res.data

            localStorage.setItem('access_token', access)
            localStorage.setItem('refresh_token', refresh)
            setToken(access)

            const payload = JSON.parse(atob(access.split('.')[1]))

            // Intentar cargar el perfil completo para evitar campos faltantes del JWT.
            try {
                const meRes = await fetchMe()
                const fullUser = meRes.data
                setUser(fullUser)
                localStorage.setItem('user', JSON.stringify(fullUser))
            } catch {
                setUser(payload)
                localStorage.setItem('user', JSON.stringify(payload))
            }
        } catch (error) {
            console.log('Error detallado:', error.response?.data)  // ← agrega esto
            throw error
        }
        }

    const refreshUser = async () => {
        try {
        const res = await fetchMe()
        const updatedUser = { ...user, ...res.data }
        setUser(updatedUser)
        localStorage.setItem('user', JSON.stringify(updatedUser))
        } catch (error) {
        console.log('Error al refrescar usuario:', error)
        }
    }

    const logout = () => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        setToken(null)
        setUser(null)
    }

    const updateUser = (updatedUserData) => {
        setUser(updatedUserData)
        localStorage.setItem('user', JSON.stringify(updatedUserData))
    }

    useEffect(() => {
        if (token) {
            refreshUser()
        }
    }, [token])

    return (
        <AuthContext.Provider value={{ user, token, login, logout, refreshUser, updateUser }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)