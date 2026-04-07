import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, ExternalLink, FileText, FolderOpen, Headphones, Link2, Package, Search, Video, X } from 'lucide-react'
import Layout from '../components/Layout'
import { cursosApi } from '../api/cursos'

const getResourceMeta = (item) => {
  switch (item.tipo) {
    case 'video':
      return {
        Icon: Video,
        badge: 'Video',
        iconClassName: 'text-rose-600',
        badgeClassName: 'bg-rose-100 text-rose-700',
      }
    case 'audio':
      return {
        Icon: Headphones,
        badge: 'Audio',
        iconClassName: 'text-emerald-600',
        badgeClassName: 'bg-emerald-100 text-emerald-700',
      }
    case 'enlace':
      return {
        Icon: Link2,
        badge: 'Enlace',
        iconClassName: 'text-violet-600',
        badgeClassName: 'bg-violet-100 text-violet-700',
      }
    default:
      return {
        Icon: FileText,
        badge: 'Documento',
        iconClassName: 'text-blue-600',
        badgeClassName: 'bg-blue-100 text-blue-700',
      }
  }
}

const normalizeMediaUrl = (url) => {
  if (!url) return url
  try {
    const parsed = new URL(url)
    if (parsed.pathname.startsWith('/media/')) {
      return parsed.pathname
    }
  } catch {
    // Ignore invalid URLs and return as-is.
  }
  return url
}

export default function Recursos() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [pdfModalItem, setPdfModalItem] = useState(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const data = await cursosApi.getRecursos()
      setItems(Array.isArray(data) ? data : [])
    } catch {
      setItems([])
      setError('No se pudieron cargar los recursos de tus cursos matriculados.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (!pdfModalItem) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setPdfModalItem(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [pdfModalItem])

  const recursos = useMemo(() => {
    return items.filter((item) => item.tipo !== 'carpeta')
  }, [items])

  const filteredRecursos = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) {
      return recursos
    }

    return recursos.filter((item) => {
      const curso = item.curso_titulo || ''
      const parent = item.parent_titulo || ''
      const description = item.descripcion || ''
      return `${item.titulo} ${description} ${curso} ${parent}`.toLowerCase().includes(term)
    })
  }, [recursos, search])

  const recursosByCurso = useMemo(() => {
    return filteredRecursos.reduce((accumulator, item) => {
      const key = item.curso_id || 'sin-curso'
      const title = item.curso_titulo || 'Curso sin titulo'
      if (!accumulator[key]) {
        accumulator[key] = { titulo: title, items: [] }
      }
      accumulator[key].items.push(item)
      return accumulator
    }, {})
  }, [filteredRecursos])

  const groupedRecursos = useMemo(() => {
    return Object.entries(recursosByCurso)
      .map(([cursoId, group]) => ({ cursoId, ...group }))
      .sort((left, right) => left.titulo.localeCompare(right.titulo))
  }, [recursosByCurso])

  const openResource = (item) => {
    const target = item.archivo || item.url
    if (!target) return

    if (/\.pdf(\?.*)?$/i.test(target)) {
      setPdfModalItem(item)
      return
    }

    window.open(normalizeMediaUrl(target), '_blank', 'noopener,noreferrer')
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Recursos</h1>
              <p className="text-sm text-gray-500 mt-1">
                Contenido de apoyo de todos tus cursos matriculados.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-600">
              <FolderOpen size={16} className="text-blue-600" />
              {filteredRecursos.length} recurso{filteredRecursos.length === 1 ? '' : 's'}
            </div>
          </div>

          <div className="relative max-w-xl">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por recurso, curso o carpeta"
              className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>

        {loading ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 text-sm text-gray-500">
            Cargando recursos...
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-sm text-red-700">
            {error}
          </div>
        ) : filteredRecursos.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-8 text-center">
            <Package size={32} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-700 font-medium">No hay recursos disponibles para mostrar.</p>
            <p className="mt-2 text-sm text-gray-500">
              Se mostraran automaticamente cuando tus cursos matriculados tengan contenido en mediateca.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedRecursos.map((group) => (
              <section key={group.cursoId} className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-gray-800">{group.titulo}</h2>
                  <span className="text-xs text-gray-500 font-medium">{group.items.length} elemento{group.items.length === 1 ? '' : 's'}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {group.items.map((item) => {
                    const { Icon, badge, iconClassName, badgeClassName } = getResourceMeta(item)
                    return (
                      <article key={item.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition">
                        <div className="flex items-start justify-between gap-3">
                          <div className={`p-2 rounded-lg bg-gray-50 ${iconClassName}`}>
                            <Icon size={18} />
                          </div>
                          <span className={`px-2 py-1 rounded-full text-[11px] font-semibold ${badgeClassName}`}>
                            {badge}
                          </span>
                        </div>

                        <div className="mt-3 space-y-2">
                          <h3 className="font-semibold text-gray-800 line-clamp-2">{item.titulo}</h3>
                          <p className="text-sm text-gray-500 line-clamp-2">{item.descripcion || 'Recurso del curso'}</p>
                          {item.parent_titulo && (
                            <p className="text-xs text-gray-500">Carpeta: {item.parent_titulo}</p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => openResource(item)}
                          className="mt-4 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition"
                        >
                          Abrir recurso <ArrowRight size={16} />
                        </button>
                      </article>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {pdfModalItem && (() => {
        const pdfSrc = normalizeMediaUrl(pdfModalItem.archivo || pdfModalItem.url)
        return (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
            onClick={() => setPdfModalItem(null)}
          >
            <div
              className="bg-white w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-3">
                <div className="min-w-0 flex items-center gap-2">
                  <FileText size={18} className="text-red-600 shrink-0" />
                  <span className="font-semibold text-gray-800 truncate">{pdfModalItem.titulo}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.open(pdfSrc, '_blank', 'noopener,noreferrer')}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border border-gray-200 hover:bg-gray-50 text-gray-700"
                  >
                    <ExternalLink size={14} />
                    Abrir en pestaña
                  </button>
                  <button
                    type="button"
                    onClick={() => setPdfModalItem(null)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                    aria-label="Cerrar visor PDF"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="flex-1 bg-gray-100">
                <iframe
                  src={pdfSrc}
                  title={pdfModalItem.titulo}
                  className="w-full h-full border-0"
                />
              </div>
            </div>
          </div>
        )
      })()}
    </Layout>
  )
}
