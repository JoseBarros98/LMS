import { useEffect, useMemo, useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { Bell, BookOpen, Edit3, GraduationCap, LayoutDashboard, LifeBuoy, Settings2, Sparkles, Ticket, Users } from 'lucide-react'
import { dashboardApi } from '../api/dashboard'
import Layout from '../components/Layout'
import DashboardBannerModal from '../components/DashboardBannerModal'
import {
  DashboardBarChartCard,
  DashboardPieChartCard,
  DashboardTrendChartCard,
  HighlightCard,
  InsightPanel,
  SummaryMetricCard,
} from '../components/dashboard/DashboardWidgets'
import { useAuth } from '../context/AuthContext'
import { usePermissions } from '../hooks/usePermissions'

const iconMap = {
  users: Users,
  roles: Settings2,
  courses: BookOpen,
  routes: GraduationCap,
  simulators: LayoutDashboard,
  tickets: Ticket,
  notifications: Bell,
  open: Ticket,
  in_progress: Ticket,
  resolved: Ticket,
  closed: Ticket,
  urgent: LifeBuoy,
  lessons: BookOpen,
  draft_courses: BookOpen,
  enrollments: Users,
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const { isAdmin, loading: permissionsLoading } = usePermissions()
  const [dashboardData, setDashboardData] = useState(null)
  const [dashboardLoading, setDashboardLoading] = useState(true)
  const [dashboardError, setDashboardError] = useState('')
  const [bannerModalOpen, setBannerModalOpen] = useState(false)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setDashboardLoading(true)
        setDashboardError('')
        const data = await dashboardApi.getAdminSummary()
        setDashboardData(data)
      } catch {
        setDashboardData(null)
        setDashboardError('No se pudo cargar el dashboard administrativo.')
      } finally {
        setDashboardLoading(false)
      }
    }

    fetchDashboard()
  }, [])

  const nombreCompleto = useMemo(() => {
    return [user?.name, user?.paternal_surname, user?.maternal_surname].filter(Boolean).join(' ')
  }, [user?.maternal_surname, user?.name, user?.paternal_surname])

  if (!permissionsLoading && !isAdmin()) {
    return <Navigate to="/dashboard" replace />
  }

  const overviewCards = dashboardData?.overview_cards || []
  const academy = dashboardData?.academy
  const support = dashboardData?.support
  const activity = dashboardData?.activity
  const charts = dashboardData?.charts || {}
  const bannerUrl = dashboardData?.dashboard_banner

  return (
    <Layout>
      <div className="space-y-8">
        <section className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-8 items-stretch">
          <div className="rounded-3xl overflow-hidden border border-gray-200 bg-gray-100 shadow-sm min-h-80 relative group">
            <img
              src={bannerUrl ? `http://localhost${bannerUrl}` : '/1.png'}
              alt="Portada del dashboard"
              className="w-full h-full object-cover"
            />
            <button
              onClick={() => setBannerModalOpen(true)}
              className="absolute top-4 right-4 p-2.5 bg-white/90 hover:bg-white rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
              title="Cambiar portada"
            >
              <Edit3 size={18} className="text-gray-700" />
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-gray-400">Contexto operativo</p>
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium">
                <Sparkles size={16} />
                Dashboard administrativo
              </div>
              <h2 className="mt-3 text-2xl font-bold text-gray-800">Vista exclusiva para administradores</h2>
              <p className="mt-3 text-xl font-extrabold text-slate-900 leading-tight">
                Control central para {nombreCompleto || user?.email}
              </p>
              <p className="mt-3 text-sm text-gray-500 leading-7">
                Aqui aparecen solo indicadores con valor administrativo: carga de soporte, publicacion academica,
                matriculas recientes y actividad del sistema. El estudiante ve un panel distinto y acotado a su experiencia.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Rol</p>
                <p className="mt-2 text-xl font-bold text-slate-900">{dashboardData?.role_name || 'Administrador'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Modo</p>
                <p className="mt-2 text-xl font-bold text-slate-900">Operacion</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/users"
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition"
              >
                Gestionar Usuarios
              </Link>
              <Link
                to="/tickets"
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition"
              >
                Revisar Tickets
              </Link>
            </div>
          </div>
        </section>

        {dashboardLoading ? (
          <section className="bg-white border border-gray-200 rounded-3xl p-6 text-sm text-gray-500">
            Cargando dashboard administrativo...
          </section>
        ) : dashboardError ? (
          <section className="bg-red-50 border border-red-200 rounded-3xl p-6 text-sm text-red-700">
            {dashboardError}
          </section>
        ) : (
          <>
            <section className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Resumen ejecutivo</h2>
                <p className="text-sm text-gray-500">Indicadores base para operacion, soporte y publicacion.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                {overviewCards.map((card) => (
                  <SummaryMetricCard key={card.id} card={card} iconMap={iconMap} />
                ))}
              </div>
            </section>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <DashboardBarChartCard
                title="Mix academico"
                description="Composicion actual entre publicaciones, borradores y volumen de contenido."
                data={charts.academy_mix || []}
              />
              <DashboardPieChartCard
                title="Tickets por estado"
                description="Distribucion operativa de la mesa de ayuda."
                data={charts.tickets_by_status || []}
              />
              <DashboardPieChartCard
                title="Tickets por prioridad"
                description="Concentracion de criticidad en soporte."
                data={charts.tickets_by_priority || []}
              />
            </div>

            <DashboardTrendChartCard
              title="Matriculas ultimos 7 dias"
              description="Tendencia diaria sumando matriculas de cursos y rutas."
              data={charts.enrollments_last_7_days || []}
            />

            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
              {academy && (
                <InsightPanel
                  title={academy.title}
                  description={academy.description}
                  stats={academy.stats}
                  highlights={academy.highlights}
                  iconMap={iconMap}
                />
              )}

              {support && (
                <InsightPanel
                  title={support.title}
                  description={support.description}
                  stats={support.stats}
                  highlights={support.highlights}
                  iconMap={iconMap}
                />
              )}
            </div>

            {activity && (
              <section className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-5">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">{activity.title}</h2>
                  <p className="text-sm text-gray-500">{activity.description}</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {(activity.items || []).map((item) => (
                    <HighlightCard key={item.id} item={item} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <DashboardBannerModal
        isOpen={bannerModalOpen}
        onClose={() => setBannerModalOpen(false)}
        onUpdated={(newBannerUrl) => {
          setDashboardData((prev) => ({
            ...(prev || {}),
            dashboard_banner: newBannerUrl,
          }))
        }}
      />
    </Layout>
  )
}