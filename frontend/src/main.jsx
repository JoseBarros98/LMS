import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import PrivateRoute from './components/PrivateRoute'
import Login from './pages/Login'
import App from './App'
import './index.css'
import Usuarios from './pages/Usuarios'
import Roles from './pages/Roles'
import Configuracion from './pages/Configuracion'
import Tickets from './pages/Tickets'
import Categorias from './pages/Categorias'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/dashboard" element={
            <PrivateRoute>
              <App />
            </PrivateRoute>
          } />

          <Route path="*" element={<Navigate to="/login" replace />}/>

          <Route path="/users" element={
            <PrivateRoute>
              <Usuarios />
            </PrivateRoute>
          } />

          <Route path="/roles" element={
            <PrivateRoute>
              <Roles />
            </PrivateRoute>
          } />

          <Route path="/configuracion" element={
            <PrivateRoute>
              <Configuracion />
            </PrivateRoute>
          } />

          <Route path="/tickets" element={
            <PrivateRoute>
              <Tickets />
            </PrivateRoute>
          } />

          <Route path="/categorias" element={
            <PrivateRoute>
              <Categorias />
            </PrivateRoute>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
