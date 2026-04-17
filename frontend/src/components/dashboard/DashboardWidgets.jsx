import { ArrowRight, LayoutDashboard } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const toneClasses = {
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
  sky: 'bg-sky-100 text-sky-700 border-sky-200',
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  rose: 'bg-rose-100 text-rose-700 border-rose-200',
}

const chartPalette = ['#0f172a', '#0284c7', '#10b981', '#6366f1', '#f59e0b', '#f43f5e']

export function SummaryMetricCard({ card, iconMap }) {
  const Icon = iconMap[card.id] || LayoutDashboard
  const toneClass = toneClasses[card.tone] || toneClasses.slate

  return (
    <Link
      to={card.href || '/dashboard'}
      className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm hover:shadow-md transition flex flex-col gap-4"
    >
      <div className="flex items-center justify-between gap-3">
        <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center ${toneClass}`}>
          <Icon size={20} />
        </div>
        <span className="text-xs uppercase tracking-[0.24em] text-gray-400">{card.label}</span>
      </div>

      <div>
        <p className="text-3xl font-bold text-gray-900">{card.value}</p>
        <p className="mt-2 text-sm text-gray-500 leading-6">{card.description}</p>
      </div>
    </Link>
  )
}

export function InsightPanel({ title, description, stats = [], highlights = [], iconMap }) {
  return (
    <section className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
        <p className="text-sm text-gray-500">{description}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {stats.map((stat) => {
          const Icon = iconMap[stat.id] || LayoutDashboard
          const toneClass = toneClasses[stat.tone] || toneClasses.slate

          return (
            <div key={stat.id} className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
              <div className="flex items-center gap-3 text-slate-700">
                <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center ${toneClass}`}>
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-500 leading-6">{stat.description}</p>
            </div>
          )
        })}
      </div>

      {highlights.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">Actividad destacada</p>
          <div className="space-y-3">
            {highlights.map((item) => (
              <HighlightCard key={item.id} item={item} compact />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

export function HighlightCard({ item, compact = false }) {
  return (
    <Link
      to={item.href || '/dashboard'}
      className={`block rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 transition ${compact ? 'p-4' : 'p-5'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-gray-800">{item.title}</p>
          <p className="mt-1 text-sm text-gray-500 leading-6">{item.subtitle}</p>
        </div>
        <ArrowRight size={16} className="text-gray-300 shrink-0 mt-1" />
      </div>
      <p className="mt-3 text-xs uppercase tracking-[0.2em] text-gray-400">{formatMetaDate(item.meta)}</p>
    </Link>
  )
}

export function DashboardBarChartCard({ title, description, data = [], dataKey = 'value' }) {
  return (
    <ChartCard title={title} description={description}>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip />
          <Bar dataKey={dataKey} radius={[12, 12, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`${entry.name}-${index}`} fill={chartPalette[index % chartPalette.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function DashboardPieChartCard({ title, description, data = [] }) {
  return (
    <ChartCard title={title} description={description}>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={90} paddingAngle={3}>
            {data.map((entry, index) => (
              <Cell key={`${entry.name}-${index}`} fill={chartPalette[index % chartPalette.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend verticalAlign="bottom" />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function DashboardTrendChartCard({ title, description, data = [], dataKey = 'value' }) {
  return (
    <ChartCard title={title} description={description}>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip />
          <Line type="monotone" dataKey={dataKey} stroke="#0f172a" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

function ChartCard({ title, description, children }) {
  return (
    <section className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-4">
      <div>
        <h3 className="text-xl font-bold text-gray-800">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      {children}
    </section>
  )
}

function formatMetaDate(value) {
  if (!value) return 'Sin fecha'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Sin fecha'

  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}