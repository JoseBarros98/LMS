import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  BarChart3,
  Check,
  ChevronRight,
  Circle,
  Clock3,
  Copy,
  Edit3,
  FolderOpen,
  Layers,
  Plus,
  RotateCcw,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import Layout from '../components/Layout'
import { flashcardsApi } from '../api/flashcards'
import { getApiErrorMessage, showError, showSuccess } from '../utils/toast'

const themeBarClasses = [
  'from-emerald-400 to-teal-500',
  'from-blue-400 to-cyan-500',
  'from-violet-400 to-fuchsia-500',
  'from-orange-400 to-red-500',
]

const initialGroupForm = {
  nombre: '',
  descripcion: '',
  visibilidad: 'private',
  primeraPregunta: '',
  primeraRespuesta: '',
}

const shuffleArray = (values) => {
  const list = [...values]
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }
  return list
}

function GroupCard({ group, colorIndex, onStudy, onCreateCard, onManageCards, onDeleteGroup, owned }) {
  const gradient = themeBarClasses[colorIndex % themeBarClasses.length]

  return (
    <article className="min-w-70 md:min-w-80 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className={`h-1.5 bg-linear-to-r ${gradient}`} />
      <div className="px-5 py-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <span
            className={`inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              group.visibilidad === 'public' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'
            }`}
          >
            {group.visibilidad === 'public' ? 'PUBLICO' : 'PRIVADO'}
          </span>
          <span className="text-xs text-slate-400">{group.cards_count || 0} cards</span>
        </div>

        <div>
          <h3 className="text-xl font-extrabold uppercase tracking-tight text-slate-900 line-clamp-2">{group.nombre}</h3>
          <p className="text-sm text-slate-500 line-clamp-2 mt-1 min-h-10">{group.descripcion || 'Sin descripcion.'}</p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-slate-50 border border-slate-200 py-2 px-1">
            <p className="text-[10px] uppercase tracking-wide text-slate-500">Personas</p>
            <p className="text-sm font-bold text-slate-800">{group.usuarios_unicos || 0}</p>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200 py-2 px-1">
            <p className="text-[10px] uppercase tracking-wide text-slate-500">Precision</p>
            <p className="text-sm font-bold text-slate-800">{Number(group.precision || 0).toFixed(1)}%</p>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200 py-2 px-1">
            <p className="text-[10px] uppercase tracking-wide text-slate-500">Tiempo medio</p>
            <p className="text-sm font-bold text-slate-800">{Number(group.tiempo_medio_seg || 0).toFixed(1)}s</p>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-full bg-slate-200 text-slate-700 text-xs font-bold inline-flex items-center justify-center">
              {group.owner_initials || 'NA'}
            </span>
            <div>
              <p className="text-xs text-slate-700 font-medium leading-tight">{group.owner_name || 'Usuario'}</p>
              <p className="text-[11px] text-slate-400 leading-tight">{group.cards_count || 0} cards</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {owned && (
              <button
                type="button"
                onClick={() => onCreateCard(group)}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300"
                title="Agregar tarjeta"
              >
                <Plus size={16} />
              </button>
            )}
            {owned && (
              <button
                type="button"
                onClick={() => onManageCards(group)}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300"
                title="Editar o eliminar tarjetas"
              >
                <Edit3 size={16} />
              </button>
            )}
            {owned && (
              <button
                type="button"
                onClick={() => onDeleteGroup(group)}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-rose-300 text-rose-500 hover:text-rose-600"
                title="Eliminar grupo"
              >
                <Trash2 size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={() => onStudy(group)}
              className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300"
              title="Estudiar"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

function StudyView({ group, onBack }) {
  const totalCards = group.cards.length
  const [cards, setCards] = useState(group.cards)
  const [cardIndex, setCardIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [timePerCard, setTimePerCard] = useState(5)
  const [remainingSeconds, setRemainingSeconds] = useState(5)
  const [correctCount, setCorrectCount] = useState(0)
  const [incorrectCount, setIncorrectCount] = useState(0)
  const [questionStartedAt, setQuestionStartedAt] = useState(() => Date.now())

  const currentCard = cards[cardIndex] || null
  const isFinished = cardIndex >= totalCards

  useEffect(() => {
    if (isFinished || showAnswer) return undefined

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          setShowAnswer(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isFinished, showAnswer])

  useEffect(() => {
    setRemainingSeconds(timePerCard)
  }, [timePerCard, cardIndex])

  useEffect(() => {
    if (!showAnswer) {
      setQuestionStartedAt(Date.now())
    }
  }, [cardIndex, showAnswer])

  const progress = totalCards > 0 ? Math.round((cardIndex / totalCards) * 100) : 0

  const restartDeck = (shuffle = false) => {
    const deck = shuffle ? shuffleArray(group.cards) : [...group.cards]
    setCards(deck)
    setCardIndex(0)
    setShowAnswer(false)
    setRemainingSeconds(timePerCard)
    setCorrectCount(0)
    setIncorrectCount(0)
    setQuestionStartedAt(Date.now())
  }

  const updateTimePerCard = (delta) => {
    setTimePerCard((prev) => {
      const next = Math.min(30, Math.max(1, prev + delta))
      return next
    })
  }

  const submitResult = async (wasCorrect) => {
    if (!currentCard) return

    try {
      await flashcardsApi.registerAnswer(group.id, {
        card_id: currentCard.id,
        fue_correcta: wasCorrect,
        duracion_segundos: Math.max(0, Math.round((Date.now() - questionStartedAt) / 1000)),
      })
    } catch {
      // Continue study flow even if telemetry fails.
    }

    if (wasCorrect) {
      setCorrectCount((prev) => prev + 1)
    } else {
      setIncorrectCount((prev) => prev + 1)
    }

    setShowAnswer(false)
    setCardIndex((prev) => prev + 1)
  }

  if (totalCards === 0) {
    return (
      <div className="max-w-5xl mx-auto">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-4">
          <ArrowLeft size={16} /> Volver a grupos
        </button>
        <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">Este grupo aun no tiene tarjetas</h2>
          <p className="text-slate-500 mt-2">Agrega al menos una flashcard para empezar una sesion de estudio.</p>
        </div>
      </div>
    )
  }

  if (isFinished) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
          <ArrowLeft size={16} /> Volver a grupos
        </button>

        <section className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm text-center">
          <h2 className="text-3xl font-extrabold text-slate-900">Sesion completada</h2>
          <p className="text-slate-500 mt-2">Terminaste {totalCards} tarjetas del grupo {group.nombre}.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-sm text-emerald-700">Correctas</p>
              <p className="text-3xl font-bold text-emerald-800 mt-1">{correctCount}</p>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
              <p className="text-sm text-rose-700">Incorrectas</p>
              <p className="text-3xl font-bold text-rose-800 mt-1">{incorrectCount}</p>
            </div>
          </div>

          <div className="mt-7 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => restartDeck(false)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50"
            >
              <RotateCcw size={16} /> Reiniciar orden
            </button>
            <button
              type="button"
              onClick={() => restartDeck(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800"
            >
              <Copy size={16} /> Mezclar y reiniciar
            </button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft size={16} /> Volver a grupos
      </button>

      <section className="bg-white border border-slate-200 rounded-3xl px-6 py-5 shadow-sm flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl bg-linear-to-br from-violet-500 to-indigo-500 text-white inline-flex items-center justify-center shadow-lg">
            <Layers size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold uppercase leading-tight text-slate-900">{group.nombre}</h1>
            <p className="text-sm text-slate-500">{group.descripcion || 'Repaso de contenidos por tarjetas.'}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-semibold">
                {group.visibilidad === 'public' ? 'Publico' : 'Privado'}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                {totalCards} tarjetas
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="rounded-lg bg-slate-50 border border-slate-200 py-1.5 px-2">
                <p className="text-[10px] uppercase text-slate-500">Personas</p>
                <p className="text-sm font-bold text-slate-800">{group.usuarios_unicos || 0}</p>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 py-1.5 px-2">
                <p className="text-[10px] uppercase text-slate-500">Precision</p>
                <p className="text-sm font-bold text-slate-800">{Number(group.precision || 0).toFixed(1)}%</p>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 py-1.5 px-2">
                <p className="text-[10px] uppercase text-slate-500">Tiempo medio</p>
                <p className="text-sm font-bold text-slate-800">{Number(group.tiempo_medio_seg || 0).toFixed(1)}s</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 min-w-72">
          <p className="text-[11px] uppercase tracking-wide font-semibold text-slate-500">Frenador (seg)</p>
          <div className="flex items-center gap-2 mt-1.5">
            <button
              type="button"
              onClick={() => updateTimePerCard(-1)}
              className="h-8 w-8 rounded-lg border border-slate-300 inline-flex items-center justify-center text-slate-600 hover:text-slate-900"
            >
              -
            </button>
            <div className="h-8 min-w-14 rounded-lg border border-slate-300 bg-white inline-flex items-center justify-center text-slate-900 font-semibold">
              {timePerCard}
            </div>
            <button
              type="button"
              onClick={() => updateTimePerCard(1)}
              className="h-8 w-8 rounded-lg border border-slate-300 inline-flex items-center justify-center text-slate-600 hover:text-slate-900"
            >
              +
            </button>

            <button
              type="button"
              onClick={() => restartDeck(true)}
              className="ml-auto inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-600 hover:text-slate-900"
            >
              <RotateCcw size={14} /> Mezclar y Reiniciar
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>Tarjeta {cardIndex + 1} de {totalCards}</span>
          <span>{progress}% completado</span>
        </div>
        <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
          <div className="h-full bg-linear-to-r from-blue-500 to-fuchsia-500" style={{ width: `${progress}%` }} />
        </div>
      </section>

      <article className="bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden min-h-115 flex flex-col">
        <div className="flex-1 px-8 py-8 flex flex-col items-center justify-center text-center">
          <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold tracking-wide bg-indigo-100 text-indigo-700 uppercase">
            {showAnswer ? 'Respuesta' : 'Pregunta'}
          </span>

          <p className="mt-6 text-4xl md:text-[44px] font-extrabold text-slate-800 leading-tight max-w-4xl">
            {showAnswer ? currentCard.respuesta : currentCard.pregunta}
          </p>

          {!showAnswer ? (
            <button
              type="button"
              onClick={() => setShowAnswer(true)}
              className="mt-8 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800"
            >
              Mostrar respuesta
            </button>
          ) : null}
        </div>

        {!showAnswer ? (
          <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-between">
            <div className="inline-flex items-center gap-2 text-emerald-600">
              <div className="h-9 w-9 rounded-full bg-emerald-100 inline-flex items-center justify-center">
                <Clock3 size={16} />
              </div>
              <div>
                <p className="text-2xl font-bold leading-none">{remainingSeconds}s</p>
                <p className="text-[11px] text-slate-500 uppercase tracking-wide">Tiempo restante</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="border-t border-slate-200 px-6 py-4 bg-slate-50">
            <p className="text-center text-sm text-slate-600 mb-3">Como te fue?</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => submitResult(false)}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-rose-300 text-rose-600 font-semibold hover:bg-rose-50"
              >
                <X size={16} /> Incorrecto
              </button>
              <button
                type="button"
                onClick={() => submitResult(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600"
              >
                <Check size={16} /> Correcto
              </button>
            </div>
          </div>
        )}
      </article>
    </div>
  )
}

function ManageCardsModal({ group, onClose, onUpdated }) {
  const [cards, setCards] = useState(Array.isArray(group.cards) ? group.cards : [])
  const [loading, setLoading] = useState(false)
  const [editingCardId, setEditingCardId] = useState(null)
  const [editForm, setEditForm] = useState({ pregunta: '', respuesta: '' })

  const loadCards = useCallback(async () => {
    try {
      setLoading(true)
      const detail = await flashcardsApi.getGroupDetail(group.id)
      setCards(Array.isArray(detail.cards) ? detail.cards : [])
    } catch (error) {
      showError(getApiErrorMessage(error, 'No se pudieron cargar las tarjetas del grupo.'))
    } finally {
      setLoading(false)
    }
  }, [group.id])

  useEffect(() => {
    loadCards()
  }, [loadCards])

  const beginEdit = (card) => {
    setEditingCardId(card.id)
    setEditForm({ pregunta: card.pregunta, respuesta: card.respuesta })
  }

  const cancelEdit = () => {
    setEditingCardId(null)
    setEditForm({ pregunta: '', respuesta: '' })
  }

  const saveEdit = async (card) => {
    if (!editForm.pregunta.trim() || !editForm.respuesta.trim()) {
      showError('Debes completar pregunta y respuesta para guardar.')
      return
    }

    try {
      await flashcardsApi.updateCard(card.id, {
        pregunta: editForm.pregunta.trim(),
        respuesta: editForm.respuesta.trim(),
      })
      showSuccess('Tarjeta actualizada correctamente.')
      cancelEdit()
      await loadCards()
      await onUpdated()
    } catch (error) {
      showError(getApiErrorMessage(error, 'No se pudo actualizar la tarjeta.'))
    }
  }

  const removeCard = async (card) => {
    const ok = window.confirm('¿Seguro que deseas eliminar esta tarjeta?')
    if (!ok) return

    try {
      await flashcardsApi.deleteCard(card.id)
      showSuccess('Tarjeta eliminada correctamente.')
      await loadCards()
      await onUpdated()
    } catch (error) {
      showError(getApiErrorMessage(error, 'No se pudo eliminar la tarjeta.'))
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl border border-slate-200 shadow-2xl max-h-[85vh] overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Gestionar tarjetas: {group.nombre}</h3>
            <p className="text-sm text-slate-500">Edita o elimina tarjetas del grupo sin salir de esta pantalla.</p>
          </div>
          <button
            type="button"
            className="h-9 w-9 rounded-full border border-slate-300 text-slate-500 inline-flex items-center justify-center hover:text-slate-700"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto max-h-[calc(85vh-84px)] space-y-3">
          {loading ? (
            <p className="text-sm text-slate-500">Cargando tarjetas...</p>
          ) : cards.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
              Este grupo no tiene tarjetas aun.
            </div>
          ) : (
            cards.map((card, index) => (
              <div key={card.id} className="rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Tarjeta {index + 1}</span>
                  <div className="flex items-center gap-2">
                    {editingCardId === card.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => saveEdit(card)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600"
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm text-slate-600 hover:text-slate-800"
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => beginEdit(card)}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:text-slate-900"
                          title="Editar tarjeta"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeCard(card)}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-rose-300 text-rose-500 hover:text-rose-600"
                          title="Eliminar tarjeta"
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {editingCardId === card.id ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <textarea
                      value={editForm.pregunta}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, pregunta: event.target.value }))}
                      className="px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 min-h-20"
                    />
                    <textarea
                      value={editForm.respuesta}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, respuesta: event.target.value }))}
                      className="px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 min-h-20"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                      <p className="text-[10px] uppercase text-slate-500">Pregunta</p>
                      <p className="text-slate-800 mt-1 whitespace-pre-wrap">{card.pregunta}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                      <p className="text-[10px] uppercase text-slate-500">Respuesta</p>
                      <p className="text-slate-800 mt-1 whitespace-pre-wrap">{card.respuesta}</p>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default function Flashcards() {
  const navigate = useNavigate()
  const { groupId } = useParams()

  const [communityGroups, setCommunityGroups] = useState([])
  const [myGroups, setMyGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [groupForm, setGroupForm] = useState(initialGroupForm)
  const [creatingGroup, setCreatingGroup] = useState(false)

  const [createCardTarget, setCreateCardTarget] = useState(null)
  const [cardForm, setCardForm] = useState({ pregunta: '', respuesta: '' })
  const [creatingCard, setCreatingCard] = useState(false)
  const [manageCardsTarget, setManageCardsTarget] = useState(null)
  const [deletingGroupId, setDeletingGroupId] = useState(null)

  const [studyGroup, setStudyGroup] = useState(null)
  const [loadingStudy, setLoadingStudy] = useState(false)

  const listCount = useMemo(() => communityGroups.length + myGroups.length, [communityGroups.length, myGroups.length])

  const loadGroups = useCallback(async () => {
    try {
      setLoading(true)
      setErrorMessage('')

      const [community, mine] = await Promise.all([
        flashcardsApi.getGroups({ scope: 'community' }),
        flashcardsApi.getGroups({ scope: 'mine' }),
      ])

      setCommunityGroups(Array.isArray(community) ? community : [])
      setMyGroups(Array.isArray(mine) ? mine : [])
    } catch (error) {
      setCommunityGroups([])
      setMyGroups([])
      const message = getApiErrorMessage(error, 'No se pudieron cargar los grupos de flashcards.')
      setErrorMessage(message)
      showError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadStudyGroup = useCallback(async () => {
    if (!groupId) {
      setStudyGroup(null)
      return
    }

    try {
      setLoadingStudy(true)
      const detail = await flashcardsApi.getGroupDetail(groupId)
      setStudyGroup({ ...detail, cards: Array.isArray(detail.cards) ? detail.cards : [] })
    } catch (error) {
      setStudyGroup(null)
      const message = getApiErrorMessage(error, 'No se pudo abrir el modo estudio de este grupo.')
      showError(message)
      navigate('/flashcards', { replace: true })
    } finally {
      setLoadingStudy(false)
    }
  }, [groupId, navigate])

  useEffect(() => {
    loadGroups()
  }, [loadGroups])

  useEffect(() => {
    loadStudyGroup()
  }, [loadStudyGroup])

  const handleOpenStudy = (group) => {
    navigate(`/flashcards/${group.id}`)
  }

  const handleCloseStudy = () => {
    navigate('/flashcards')
  }

  const updateGroupForm = (event) => {
    const { name, value } = event.target
    setGroupForm((prev) => ({ ...prev, [name]: value }))
  }

  const submitNewGroup = async (event) => {
    event.preventDefault()

    if (!groupForm.nombre.trim()) {
      showError('El nombre del grupo es obligatorio.')
      return
    }

    try {
      setCreatingGroup(true)
      const createdGroup = await flashcardsApi.createGroup({
        nombre: groupForm.nombre.trim(),
        descripcion: groupForm.descripcion.trim(),
        visibilidad: groupForm.visibilidad,
      })

      const firstQuestion = groupForm.primeraPregunta.trim()
      const firstAnswer = groupForm.primeraRespuesta.trim()

      if (firstQuestion && firstAnswer) {
        await flashcardsApi.createCard({
          grupo: createdGroup.id,
          pregunta: firstQuestion,
          respuesta: firstAnswer,
          orden: 1,
        })
      }

      showSuccess('Grupo creado correctamente.')
      setGroupForm(initialGroupForm)
      setShowCreateModal(false)
      await loadGroups()
    } catch (error) {
      showError(getApiErrorMessage(error, 'No se pudo crear el grupo.'))
    } finally {
      setCreatingGroup(false)
    }
  }

  const submitQuickCard = async (event) => {
    event.preventDefault()

    if (!createCardTarget) return
    if (!cardForm.pregunta.trim() || !cardForm.respuesta.trim()) {
      showError('Debes completar pregunta y respuesta.')
      return
    }

    try {
      setCreatingCard(true)
      await flashcardsApi.createCard({
        grupo: createCardTarget.id,
        pregunta: cardForm.pregunta.trim(),
        respuesta: cardForm.respuesta.trim(),
        orden: Number(createCardTarget.cards_count || 0) + 1,
      })

      showSuccess('Tarjeta creada correctamente.')
      setCardForm({ pregunta: '', respuesta: '' })
      setCreateCardTarget(null)
      await loadGroups()

      if (groupId && Number(groupId) === Number(createCardTarget.id)) {
        await loadStudyGroup()
      }
    } catch (error) {
      showError(getApiErrorMessage(error, 'No se pudo crear la tarjeta.'))
    } finally {
      setCreatingCard(false)
    }
  }

  const handleDeleteGroup = async (group) => {
    const ok = window.confirm(`¿Seguro que deseas eliminar el grupo "${group.nombre}"? Esta accion eliminara todas sus tarjetas.`)
    if (!ok) return

    try {
      setDeletingGroupId(group.id)
      await flashcardsApi.deleteGroup(group.id)
      showSuccess('Grupo eliminado correctamente.')

      if (manageCardsTarget && Number(manageCardsTarget.id) === Number(group.id)) {
        setManageCardsTarget(null)
      }

      if (groupId && Number(groupId) === Number(group.id)) {
        navigate('/flashcards', { replace: true })
      }

      await loadGroups()
    } catch (error) {
      showError(getApiErrorMessage(error, 'No se pudo eliminar el grupo.'))
    } finally {
      setDeletingGroupId(null)
    }
  }

  return (
    <Layout>
      {groupId ? (
        loadingStudy ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 text-slate-500">Cargando modo estudio...</div>
        ) : studyGroup ? (
          <StudyView group={studyGroup} onBack={handleCloseStudy} />
        ) : null
      ) : (
        <div className="space-y-7">
          <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-2xl bg-linear-to-br from-indigo-500 to-violet-500 text-white inline-flex items-center justify-center shadow-lg">
                  <Layers size={26} />
                </div>
                <div>
                  <h1 className="text-4xl font-extrabold text-slate-900">Flashcards</h1>
                  <p className="text-slate-500 mt-1">Explora, crea y repasa tus tarjetas de estudio.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800"
              >
                <Plus size={16} /> Crear Nuevo Grupo
              </button>
            </div>
          </section>

          {errorMessage ? (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 text-sm text-rose-700">{errorMessage}</div>
          ) : null}

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900 inline-flex items-center gap-2">
                <Circle size={16} className="text-slate-400" /> Comunidad
              </h2>
              <span className="text-xs h-5 min-w-5 px-1.5 rounded-full bg-slate-100 text-slate-600 inline-flex items-center justify-center">
                {communityGroups.length}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-xl bg-white border border-slate-200 p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-500 inline-flex items-center gap-1"><Users size={14} /> Personas activas</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">
                  {communityGroups.reduce((acc, item) => acc + Number(item.usuarios_unicos || 0), 0)}
                </p>
              </div>
              <div className="rounded-xl bg-white border border-slate-200 p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-500 inline-flex items-center gap-1"><BarChart3 size={14} /> Precision promedio</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">
                  {communityGroups.length > 0
                    ? `${(communityGroups.reduce((acc, item) => acc + Number(item.precision || 0), 0) / communityGroups.length).toFixed(1)}%`
                    : '0.0%'}
                </p>
              </div>
              <div className="rounded-xl bg-white border border-slate-200 p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-500 inline-flex items-center gap-1"><Clock3 size={14} /> Tiempo medio</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">
                  {communityGroups.length > 0
                    ? `${(communityGroups.reduce((acc, item) => acc + Number(item.tiempo_medio_seg || 0), 0) / communityGroups.length).toFixed(1)}s`
                    : '0.0s'}
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm overflow-x-auto">
              {loading ? (
                <p className="text-sm text-slate-500">Cargando grupos...</p>
              ) : communityGroups.length === 0 ? (
                <p className="text-sm text-slate-500">Todavia no hay grupos publicos.</p>
              ) : (
                <div className="flex gap-4 pb-2 min-w-full">
                  {communityGroups.map((group, index) => (
                    <GroupCard
                      key={group.id}
                      group={group}
                      colorIndex={index}
                      onStudy={handleOpenStudy}
                      onCreateCard={() => {}}
                      onManageCards={() => {}}
                      onDeleteGroup={() => {}}
                      owned={false}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900 inline-flex items-center gap-2">
                <FolderOpen size={18} className="text-indigo-500" /> Mis Colecciones
              </h2>
              <span className="text-sm font-semibold text-indigo-600">{myGroups.length}</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 min-h-72 shadow-sm">
              {loading ? (
                <p className="text-sm text-slate-500">Cargando tus colecciones...</p>
              ) : myGroups.length === 0 ? (
                <div className="h-full min-h-64 flex flex-col items-center justify-center text-center">
                  <div className="h-14 w-14 rounded-full bg-slate-100 text-slate-400 inline-flex items-center justify-center">
                    <Copy size={24} />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-800 mt-4">Tu coleccion esta vacia</h3>
                  <p className="text-slate-500 mt-1 max-w-lg">Crea tu primer grupo de flashcards para empezar a estudiar.</p>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800"
                  >
                    <Plus size={16} /> Crear Grupo
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {myGroups.map((group, index) => (
                    <GroupCard
                      key={group.id}
                      group={group}
                      colorIndex={index + 1}
                      onStudy={handleOpenStudy}
                      onCreateCard={(targetGroup) => setCreateCardTarget(targetGroup)}
                      onManageCards={(targetGroup) => setManageCardsTarget(targetGroup)}
                      onDeleteGroup={(targetGroup) => handleDeleteGroup(targetGroup)}
                      owned
                    />
                  ))}
                </div>
              )}
            </div>
          </section>

          <div className="text-xs text-slate-400">
            Total de grupos visibles: {listCount}
            {deletingGroupId ? ' | Eliminando grupo...' : ''}
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h3 className="text-2xl font-bold text-slate-900">Nuevo Grupo de Aprendizaje</h3>
              <button
                type="button"
                className="h-9 w-9 rounded-full border border-slate-300 text-slate-500 inline-flex items-center justify-center hover:text-slate-700"
                onClick={() => setShowCreateModal(false)}
                disabled={creatingGroup}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitNewGroup} className="p-5 space-y-4">
              <div>
                <label htmlFor="nombre" className="text-sm font-semibold text-slate-700">Nombre del Grupo</label>
                <input
                  id="nombre"
                  name="nombre"
                  value={groupForm.nombre}
                  onChange={updateGroupForm}
                  placeholder="Ej: Anatomia Basica"
                  className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  maxLength={140}
                  required
                />
              </div>

              <div>
                <label htmlFor="descripcion" className="text-sm font-semibold text-slate-700">Descripcion</label>
                <textarea
                  id="descripcion"
                  name="descripcion"
                  value={groupForm.descripcion}
                  onChange={updateGroupForm}
                  placeholder="Breve descripcion del contenido..."
                  className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 min-h-24"
                />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-700">Visibilidad</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => setGroupForm((prev) => ({ ...prev, visibilidad: 'public' }))}
                    className={`p-3 rounded-xl border text-left ${
                      groupForm.visibilidad === 'public' ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300'
                    }`}
                  >
                    <p className="font-semibold text-slate-900">Publico</p>
                    <p className="text-xs text-slate-500 mt-1">Cualquier usuario puede ver y repasar este grupo.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGroupForm((prev) => ({ ...prev, visibilidad: 'private' }))}
                    className={`p-3 rounded-xl border text-left ${
                      groupForm.visibilidad === 'private' ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300'
                    }`}
                  >
                    <p className="font-semibold text-slate-900">Privado</p>
                    <p className="text-xs text-slate-500 mt-1">Solo tu puedes ver este grupo.</p>
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-700">Primera tarjeta (opcional)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  <input
                    name="primeraPregunta"
                    value={groupForm.primeraPregunta}
                    onChange={updateGroupForm}
                    placeholder="Pregunta"
                    className="px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <input
                    name="primeraRespuesta"
                    value={groupForm.primeraRespuesta}
                    onChange={updateGroupForm}
                    placeholder="Respuesta"
                    className="px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 hover:text-slate-800"
                  disabled={creatingGroup}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingGroup}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-semibold disabled:opacity-70"
                >
                  {creatingGroup ? 'Creando...' : 'Crear Grupo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {createCardTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">Agregar tarjeta a {createCardTarget.nombre}</h3>
              <button
                type="button"
                className="h-9 w-9 rounded-full border border-slate-300 text-slate-500 inline-flex items-center justify-center hover:text-slate-700"
                onClick={() => setCreateCardTarget(null)}
                disabled={creatingCard}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitQuickCard} className="p-5 space-y-3">
              <div>
                <label htmlFor="card-pregunta" className="text-sm font-semibold text-slate-700">Pregunta</label>
                <textarea
                  id="card-pregunta"
                  value={cardForm.pregunta}
                  onChange={(event) => setCardForm((prev) => ({ ...prev, pregunta: event.target.value }))}
                  className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 min-h-20"
                  required
                />
              </div>

              <div>
                <label htmlFor="card-respuesta" className="text-sm font-semibold text-slate-700">Respuesta</label>
                <textarea
                  id="card-respuesta"
                  value={cardForm.respuesta}
                  onChange={(event) => setCardForm((prev) => ({ ...prev, respuesta: event.target.value }))}
                  className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 min-h-20"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setCreateCardTarget(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 hover:text-slate-800"
                  disabled={creatingCard}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingCard}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-semibold disabled:opacity-70"
                >
                  {creatingCard ? 'Guardando...' : 'Guardar tarjeta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {manageCardsTarget && (
        <ManageCardsModal
          group={manageCardsTarget}
          onClose={() => setManageCardsTarget(null)}
          onUpdated={async () => {
            await loadGroups()
            if (groupId && Number(groupId) === Number(manageCardsTarget.id)) {
              await loadStudyGroup()
            }
          }}
        />
      )}
    </Layout>
  )
}
