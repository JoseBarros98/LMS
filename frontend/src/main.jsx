import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import PrivateRoute from './components/PrivateRoute'
import Login from './pages/Login'
import './index.css'
import AdminDashboard from './pages/AdminDashboard'
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
import Calendario from './pages/Calendario'
import Flashcards from './pages/Flashcards'
import StudentDashboard from './pages/StudentDashboard'
import Notificaciones from './pages/Notificaciones'
import MensajesWhatsapp from './pages/MensajesWhatsapp'
import DatabaseBackups from './pages/DatabaseBackups'
import Auditoria from './pages/Auditoria'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/dashboard" element={
            <PrivateRoute requiredPage="dashboard">
              <StudentDashboard />
            </PrivateRoute>
          } />

          <Route path="/admin/dashboard" element={
            <PrivateRoute requiredPage="dashboard" adminOnly>
              <AdminDashboard />
            </PrivateRoute>
          } />

          <Route path="*" element={<Navigate to="/login" replace />}/>

          <Route path="/users" element={
            <PrivateRoute requiredPage="users">
              <Usuarios />
            </PrivateRoute>
          } />

          <Route path="/roles" element={
            <PrivateRoute requiredPage="roles">
              <Roles />
            </PrivateRoute>
          } />

          <Route path="/configuracion" element={
            <PrivateRoute>
              <Configuracion />
            </PrivateRoute>
          } />

          <Route path="/mensajes-whatsapp" element={
            <PrivateRoute requiredPage="mensajes_whatsapp">
              <MensajesWhatsapp />
            </PrivateRoute>
          } />

          <Route path="/backup-bd" element={
            <PrivateRoute requiredPage="backup_bd">
              <DatabaseBackups />
            </PrivateRoute>
          } />

          <Route path="/auditoria" element={
            <PrivateRoute requiredPage="auditoria">
              <Auditoria />
            </PrivateRoute>
          } />

          <Route path="/tickets" element={
            <PrivateRoute requiredPage="tickets">
              <Tickets />
            </PrivateRoute>
          } />

          <Route path="/notificaciones" element={
            <PrivateRoute requiredPage="notifications">
              <Notificaciones />
            </PrivateRoute>
          } />

          <Route path="/categorias" element={
            <PrivateRoute requiredPage="categorias">
              <Categorias />
            </PrivateRoute>
          } />

          <Route path="/courses" element={
            <PrivateRoute requiredPage="cursos">
              <Cursos />
            </PrivateRoute>
          } />

          <Route path="/matriculas" element={
            <PrivateRoute requiredPage="matriculas">
              <Matriculas />
            </PrivateRoute>
          } />

          <Route path="/rutas" element={
            <PrivateRoute requiredPage="rutas">
              <Rutas />
            </PrivateRoute>
          } />

          <Route path="/rutas/:id/cursos" element={
            <PrivateRoute requiredPage="rutas">
              <RutaCursos />
            </PrivateRoute>
          } />

          <Route path="/rutas/:id/inscripciones" element={
            <PrivateRoute requiredPage="matriculas">
              <RutaInscripciones />
            </PrivateRoute>
          } />

          <Route path="/courses/:id/inscripciones" element={
            <PrivateRoute requiredPage="matriculas">
              <CursoInscripciones />
            </PrivateRoute>
          } />

          <Route path="/courses/:id" element={
            <PrivateRoute requiredPage="cursos">
              <CursoDetalle />
            </PrivateRoute>
          } />

          <Route path="/recursos" element={
            <PrivateRoute requiredPage="recursos">
              <Recursos />
            </PrivateRoute>
          } />

          <Route path="/simuladores" element={
            <PrivateRoute requiredPage="simuladores">
              <Simuladores />
            </PrivateRoute>
          } />

          <Route path="/simuladores/:simuladorId/resolver/:intentoId" element={
            <PrivateRoute requiredPage="simuladores">
              <SimuladorResolver />
            </PrivateRoute>
          } />

          <Route path="/simuladores/:simuladorId/resultado/:intentoId" element={
            <PrivateRoute requiredPage="simuladores">
              <SimuladorResultado />
            </PrivateRoute>
          } />

          <Route path="/simuladores/:simuladorId/ranking" element={
            <PrivateRoute requiredPage="simuladores">
              <SimuladorRanking />
            </PrivateRoute>
          } />

          <Route path="/calendario" element={
            <PrivateRoute requiredPage="calendario">
              <Calendario />
            </PrivateRoute>
          } />

          <Route path="/flashcards" element={
            <PrivateRoute requiredPage="flashcards">
              <Flashcards />
            </PrivateRoute>
          } />

          <Route path="/flashcards/:groupId" element={
            <PrivateRoute requiredPage="flashcards">
              <Flashcards />
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
