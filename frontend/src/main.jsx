import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
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
import Cursos from './pages/Cursos'
import CursoDetalle from './pages/CursoDetalle'
import Recursos from './pages/Recursos'
import Matriculas from './pages/Matriculas'
import Rutas from './pages/Rutas'
import RutaCursos from './pages/RutaCursos'
import RutaInscripciones from './pages/RutaInscripciones'
import CursoInscripciones from './pages/CursoInscripciones'
import Simuladores from './pages/Simuladores'
import SimuladorResolver from './pages/SimuladorResolver'
import SimuladorResultado from './pages/SimuladorResultado'
import SimuladorRanking from './pages/SimuladorRanking'

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

          <Route path="/courses" element={
            <PrivateRoute>
              <Cursos />
            </PrivateRoute>
          } />

          <Route path="/matriculas" element={
            <PrivateRoute>
              <Matriculas />
            </PrivateRoute>
          } />

          <Route path="/rutas" element={
            <PrivateRoute>
              <Rutas />
            </PrivateRoute>
          } />

          <Route path="/rutas/:id/cursos" element={
            <PrivateRoute>
              <RutaCursos />
            </PrivateRoute>
          } />

          <Route path="/rutas/:id/inscripciones" element={
            <PrivateRoute>
              <RutaInscripciones />
            </PrivateRoute>
          } />

          <Route path="/courses/:id/inscripciones" element={
            <PrivateRoute>
              <CursoInscripciones />
            </PrivateRoute>
          } />

          <Route path="/courses/:id" element={
            <PrivateRoute>
              <CursoDetalle />
            </PrivateRoute>
          } />

          <Route path="/recursos" element={
            <PrivateRoute>
              <Recursos />
            </PrivateRoute>
          } />

          <Route path="/simuladores" element={
            <PrivateRoute>
              <Simuladores />
            </PrivateRoute>
          } />

          <Route path="/simuladores/:simuladorId/resolver/:intentoId" element={
            <PrivateRoute>
              <SimuladorResolver />
            </PrivateRoute>
          } />

          <Route path="/simuladores/:simuladorId/resultado/:intentoId" element={
            <PrivateRoute>
              <SimuladorResultado />
            </PrivateRoute>
          } />

          <Route path="/simuladores/:simuladorId/ranking" element={
            <PrivateRoute>
              <SimuladorRanking />
            </PrivateRoute>
          } />
        </Routes>

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              borderRadius: '12px',
              background: '#111827',
              color: '#ffffff',
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
