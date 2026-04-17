import { useEffect, useState } from 'react'
import {
  Activity, Calendar, CheckCircle2, Clock, Edit2, History,
  Monitor, Plus, Trash2, Trophy, XCircle,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { simuladoresApi } from '../api/simuladores'
import SimuladorModal from '../components/SimuladorModal'
import PreguntasModal from '../components/PreguntasModal'
import HistorialModal from '../components/HistorialModal'
import InstruccionesModal from '../components/InstruccionesModal'
import SimuladorDisponibilidadUsuarioModal from '../components/SimuladorDisponibilidadUsuarioModal'
import SimuladorDisponibilidadesListModal from '../components/SimuladorDisponibilidadesListModal'

const gradients = [
  'from-violet-600 via-purple-600 to-indigo-700',
  'from-pink-600 via-rose-500 to-red-600',
  'from-blue-600 via-cyan-500 to-teal-600',
  'from-amber-500 via-orange-500 to-red-500',
  'from-emerald-500 via-green-600 to-teal-700',
  'from-fuchsia-600 via-purple-500 to-pink-600',
]

function getGradient(index) {
  return gradients[index % gradients.length]
}

function formatDateRange(apertura, cierre) {
  const fmt = (d) =>
    d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '–'
  return `${fmt(apertura)} – ${fmt(cierre)}`
}

function normalizeSimuladorCoverUrl(url) {
  if (!url) return null

  try {
    const parsed = new URL(url)
    if (parsed.pathname.startsWith('/media/')) {
      return parsed.pathname
    }
  } catch {
    if (String(url).startsWith('/media/')) {
      return url
    }
  }

  return url
}

export default function Simuladores() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isAdmin = user?.role?.name?.toLowerCase() === 'administrador'

  const [simuladores, setSimuladores] = useState([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [modalSimulador, setModalSimulador] = useState(false)
  const [editSimulador, setEditSimulador] = useState(null)
  const [modalPreguntas, setModalPreguntas] = useState(null) // simulador object
  const [modalHistorial, setModalHistorial] = useState(null) // simulador object
  const [modalInstrucciones, setModalInstrucciones] = useState(null) // simulador object
  const [modalDisponibilidadUsuario, setModalDisponibilidadUsuario] = useState(null)
  const [modalDisponibilidadesList, setModalDisponibilidadesList] = useState(null)
  const [intentosPorSimulador, setIntentosPorSimulador] = useState({}) // { [simuladorId]: intentos[] }

  useEffect(() => {
    loadSimuladores()
  }, [])

  const loadSimuladores = async () => {
    try {
      setLoading(true)
      const data = await simuladoresApi.getSimuladores()
      setSimuladores(Array.isArray(data) ? data : [])
    } catch {
      setSimuladores([])
    } finally {
      setLoading(false)
    }
  }

  const loadIntentos = async (simuladorId) => {
    try {
      const data = await simuladoresApi.getMisIntentos(simuladorId)
      setIntentosPorSimulador((prev) => ({ ...prev, [simuladorId]: data }))
      return data
    } catch {
      return []
    }
  }

  const handleVerHistorial = async (sim) => {
    await loadIntentos(sim.id)
    setModalHistorial(sim)
  }

  const handleResolverClick = (sim) => {
    setModalInstrucciones(sim)
  }

  const handleIniciarExamen = async (sim) => {
    try {
      const intento = await simuladoresApi.iniciarIntento(sim.id)
      setModalInstrucciones(null)
      navigate(`/simuladores/${sim.id}/resolver/${intento.id}`)
    } catch (err) {
      alert(err?.response?.data?.detail || 'Error al iniciar el simulador.')
    }
  }

  const handleDeleteSimulador = async (id) => {
    if (!window.confirm('¿Eliminar este simulador?')) return
    try {
      await simuladoresApi.deleteSimulador(id)
      loadSimuladores()
    } catch {
      alert('No se pudo eliminar el simulador.')
    }
  }

  const intentosCompletados = (simId) =>
    (intentosPorSimulador[simId] || []).filter((i) => i.completado).length

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-xl">
              <Monitor size={24} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Mis Simuladores</h1>
              <p className="text-sm text-gray-500">Practica y mejora tus habilidades</p>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => { setEditSimulador(null); setModalSimulador(true) }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-sm font-medium"
            >
              <Plus size={16} />
              Nuevo Simulador
            </button>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : simuladores.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Monitor size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-lg">No hay simuladores disponibles.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {simuladores.map((sim, idx) => {
              const intentosCmp = intentosPorSimulador[sim.id]
                ? intentosCompletados(sim.id)
                : null

              return (
                <SimuladorCard
                  key={sim.id}
                  sim={sim}
                  index={idx}
                  isAdmin={isAdmin}
                  intentosCompletados={intentosCmp}
                  onResolver={() => handleResolverClick(sim)}
                  onVerHistorial={() => handleVerHistorial(sim)}
                  onVerRanking={() => navigate(`/simuladores/${sim.id}/ranking`)}
                  onEdit={() => { setEditSimulador(sim); setModalSimulador(true) }}
                  onDelete={() => handleDeleteSimulador(sim.id)}
                  onGestionarPreguntas={() => setModalPreguntas(sim)}
                  onGestionarDisponibilidadUsuario={() => setModalDisponibilidadUsuario({ simulador: sim, initialUserId: '' })}
                  onVerDisponibilidades={() => setModalDisponibilidadesList(sim)}
                  onLoadIntentos={() => loadIntentos(sim.id)}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {modalSimulador && (
        <SimuladorModal
          simulador={editSimulador}
          onClose={() => setModalSimulador(false)}
          onSaved={() => { setModalSimulador(false); loadSimuladores() }}
        />
      )}
      {modalPreguntas && (
        <PreguntasModal
          simulador={modalPreguntas}
          onClose={() => setModalPreguntas(null)}
        />
      )}
      {modalHistorial && (
        <HistorialModal
          simulador={modalHistorial}
          intentos={intentosPorSimulador[modalHistorial.id] || []}
          onClose={() => setModalHistorial(null)}
        />
      )}
      {modalInstrucciones && (
        <InstruccionesModal
          simulador={modalInstrucciones}
          onClose={() => setModalInstrucciones(null)}
          onComenzar={() => handleIniciarExamen(modalInstrucciones)}
        />
      )}
      {modalDisponibilidadUsuario && (
        <SimuladorDisponibilidadUsuarioModal
          simulador={modalDisponibilidadUsuario.simulador}
          initialUserId={modalDisponibilidadUsuario.initialUserId}
          onClose={() => setModalDisponibilidadUsuario(null)}
          onSaved={() => {
            const sim = modalDisponibilidadUsuario.simulador
            setModalDisponibilidadUsuario(null)
            setModalDisponibilidadesList(sim)
          }}
        />
      )}
      {modalDisponibilidadesList && (
        <SimuladorDisponibilidadesListModal
          simulador={modalDisponibilidadesList}
          onEditarUsuario={(userId) => {
            setModalDisponibilidadesList(null)
            setModalDisponibilidadUsuario({ simulador: modalDisponibilidadesList, initialUserId: userId })
          }}
          onClose={() => setModalDisponibilidadesList(null)}
        />
      )}
    </Layout>
  )
}

// ── SimuladorCard ──────────────────────────────────────────────────────────────

function SimuladorCard({
  sim, index, isAdmin,
  intentosCompletados,
  onResolver, onVerHistorial, onVerRanking, onEdit, onDelete, onGestionarPreguntas, onGestionarDisponibilidadUsuario, onVerDisponibilidades, onLoadIntentos,
}) {
  const [loaded, setLoaded] = useState(false)
  const [coverError, setCoverError] = useState(false)

  useEffect(() => {
    onLoadIntentos().then(() => setLoaded(true))
  }, [sim.id])

  useEffect(() => {
    setCoverError(false)
  }, [sim.imagen_portada_url_full, sim.imagen_portada_url])

  const portada = normalizeSimuladorCoverUrl(sim.imagen_portada_url_full || sim.imagen_portada_url)

  const disponible = sim.esta_disponible

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      {/* Cover */}
      <div className={`relative h-44 bg-gradient-to-br ${getGradient(index)} flex items-center justify-center`}>
        {portada && !coverError ? (
          <img
            src={portada}
            alt={sim.titulo}
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setCoverError(true)}
          />
        ) : (
          <Activity size={52} className="text-white/50" />
        )}
        {/* Status badge */}
        <span
          className={`absolute top-3 right-3 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 ${
            disponible
              ? 'bg-emerald-500 text-white'
              : 'bg-gray-400 text-white'
          }`}
        >
          {disponible ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
          {disponible ? 'Disponible' : 'No disponible'}
        </span>
        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3">
          <h2 className="text-white font-bold text-lg leading-tight">{sim.titulo}</h2>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        {sim.descripcion && (
          <p className="text-gray-500 text-sm line-clamp-2">{sim.descripcion}</p>
        )}

        {/* Date range */}
        <div className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700">
          <Calendar size={13} />
          <span>Disponible: {formatDateRange(sim.fecha_apertura_efectiva, sim.fecha_cierre_efectiva)}</span>
        </div>

        <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
          Asociado a: <span className="font-medium text-gray-700">{sim.curso_nombre || sim.ruta_nombre || 'Sin asociación'}</span>
        </div>

        {/* Realizados */}
        {loaded && (
          <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <History size={14} />
              <span>Realizados</span>
            </div>
            <span className="text-blue-600 font-semibold">
              {intentosCompletados ?? '–'} / {sim.max_intentos}
            </span>
          </div>
        )}

        {/* Total permitidos */}
        <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <CheckCircle2 size={14} />
            <span>Total permitidos</span>
          </div>
          <span className="bg-blue-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
            {sim.max_intentos}
          </span>
        </div>

        {/* Time limit */}
        <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Clock size={14} />
            <span>Tiempo límite</span>
          </div>
          <span className="text-gray-700 font-medium">{sim.tiempo_limite_minutos} min</span>
        </div>

        <div className="flex-1" />

        {/* Buttons */}
        <div className="flex flex-col gap-2 mt-1">
          {isAdmin && (
            <button
              onClick={onGestionarPreguntas}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition text-sm font-medium"
            >
              <Plus size={14} />
              Añadir Pregunta
            </button>
          )}
          <button
            onClick={onResolver}
            disabled={!disponible}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition text-sm"
          >
            <Activity size={15} />
            Resolver Simulador
          </button>
          <button
            onClick={onVerHistorial}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-xl transition text-sm font-medium border border-gray-200"
          >
            <History size={14} />
            Ver Mis Intentos
          </button>
          <button
            onClick={onVerRanking}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-purple-700 hover:bg-purple-50 rounded-xl transition text-sm font-medium border border-purple-200"
          >
            <Trophy size={14} />
            Ver Ranking
          </button>

          {isAdmin && (
            <div className="flex gap-2 mt-1">
              <button
                onClick={onGestionarDisponibilidadUsuario}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-xl transition font-medium"
              >
                Usuario
              </button>
              <button
                onClick={onVerDisponibilidades}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-xl transition font-medium"
              >
                Habilitados
              </button>
              <button
                onClick={onEdit}
                className="flex items-center justify-center gap-1 px-3 py-2 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
              >
                <Edit2 size={13} />
              </button>
              <button
                onClick={onDelete}
                className="flex items-center justify-center gap-1 px-3 py-2 text-xs text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition"
              >
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
