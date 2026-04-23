import { useCallback, useEffect, useMemo, useState } from 'react'
import { Database, Download, FileUp, FileDown, RefreshCw } from 'lucide-react'
import Layout from '../components/Layout'
import { backupsApi } from '../api/backups'
import { getApiErrorMessage, showConfirm, showError, showSuccess, showTextConfirm } from '../utils/toast'
import { usePermissions } from '../hooks/usePermissions'

const bytesToReadable = (bytes) => {
  if (!Number.isFinite(bytes) || bytes < 0) return '-'
  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB']
  const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / (1024 ** power)
  return `${value.toFixed(value >= 10 || power === 0 ? 0 : 1)} ${units[power]}`
}

const formatUnixDate = (timestamp) => {
  if (!Number.isFinite(timestamp)) return '-'
  return new Date(timestamp * 1000).toLocaleString()
}

const triggerBrowserDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename || 'backup.sql'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function DatabaseBackups() {
  const { hasPermission } = usePermissions()

  const canRead = hasPermission('database_backups', 'read')
  const canGenerate = hasPermission('database_backups', 'generate')
  const canDownload = hasPermission('database_backups', 'download')
  const canImport = hasPermission('database_backups', 'import')
  const canExport = hasPermission('database_backups', 'export')

  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [backups, setBackups] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [backupScope, setBackupScope] = useState('db')

  const canSeeTable = useMemo(() => canRead, [canRead])

  const loadBackups = useCallback(async () => {
    if (!canRead) {
      setBackups([])
      return
    }

    setLoading(true)
    try {
      const payload = await backupsApi.list()
      setBackups(Array.isArray(payload?.results) ? payload.results : [])
    } catch (error) {
      setBackups([])
      showError(getApiErrorMessage(error, 'No se pudo cargar el listado de backups.'))
    } finally {
      setLoading(false)
    }
  }, [canRead])

  useEffect(() => {
    loadBackups()
  }, [loadBackups])

  const handleGenerate = async () => {
    setProcessing(true)
    try {
      const payload = await backupsApi.generate(backupScope)
      showSuccess(payload?.detail || 'Backup generado correctamente.')
      await loadBackups()
    } catch (error) {
      showError(getApiErrorMessage(error, 'No se pudo generar el backup.'))
    } finally {
      setProcessing(false)
    }
  }

  const handleExport = async () => {
    setProcessing(true)
    try {
      const payload = await backupsApi.exportNow(backupScope)
      triggerBrowserDownload(payload.blob, payload.filename)
      showSuccess('Backup exportado correctamente.')
    } catch (error) {
      showError(getApiErrorMessage(error, 'No se pudo exportar el backup.'))
    } finally {
      setProcessing(false)
    }
  }

  const handleDownload = async (filename) => {
    setProcessing(true)
    try {
      const payload = await backupsApi.download(filename)
      triggerBrowserDownload(payload.blob, payload.filename)
      showSuccess('Backup descargado correctamente.')
    } catch (error) {
      showError(getApiErrorMessage(error, 'No se pudo descargar el backup.'))
    } finally {
      setProcessing(false)
    }
  }

  const handleImport = async () => {
    if (!selectedFile) {
      showError('Selecciona un archivo .sql antes de importar.')
      return
    }

    const isFullBackup = selectedFile.name.toLowerCase().endsWith('.tar.gz')
    const confirmMessage = isFullBackup
      ? 'Este backup completo restaurara base de datos y archivos media, reemplazando contenido actual. ¿Deseas continuar?'
      : 'Esta accion restaurara la base de datos y puede sobrescribir informacion actual. ¿Deseas continuar?'

    const confirmed = await showConfirm(confirmMessage)

    if (!confirmed) {
      return
    }

    if (isFullBackup) {
      const secondConfirmed = await showTextConfirm({
        message: 'Segunda confirmacion: se reemplazaran archivos media y datos actuales. Esta accion es irreversible.',
        expectedText: 'CONFIRMAR',
        placeholder: 'Escribe CONFIRMAR',
      })

      if (!secondConfirmed) {
        return
      }
    }

    setProcessing(true)
    try {
      const payload = await backupsApi.importFile(selectedFile)
      showSuccess(payload?.detail || 'Backup importado correctamente.')
      setSelectedFile(null)
      await loadBackups()
    } catch (error) {
      showError(getApiErrorMessage(error, 'No se pudo importar el backup.'))
    } finally {
      setProcessing(false)
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Backups de Base de Datos</h1>
          <p className="text-sm text-gray-500">Genera, exporta, importa y descarga respaldos SQL de la plataforma.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-gray-700">
              <Database size={18} />
              <h2 className="text-sm font-semibold">Generar backup</h2>
            </div>
            <p className="mb-3 text-sm text-gray-500">Crea un backup en el servidor y lo agrega al listado.</p>
            <select
              value={backupScope}
              onChange={(event) => setBackupScope(event.target.value)}
              className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              disabled={processing}
            >
              <option value="db">Solo base de datos (.sql)</option>
              <option value="full">Completo: base de datos + media (.tar.gz)</option>
            </select>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!canGenerate || processing}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={16} />
              Generar backup
            </button>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-gray-700">
              <FileDown size={18} />
              <h2 className="text-sm font-semibold">Exportar backup</h2>
            </div>
            <p className="mb-4 text-sm text-gray-500">Exporta y descarga un backup inmediato segun el tipo seleccionado.</p>
            <button
              type="button"
              onClick={handleExport}
              disabled={!canExport || processing}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={16} />
              Exportar ahora
            </button>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-gray-700">
              <FileUp size={18} />
              <h2 className="text-sm font-semibold">Importar backup</h2>
            </div>
            <p className="mb-4 text-sm text-gray-500">Restaura usando .sql (solo BD) o .tar.gz (BD + media).</p>
            <input
              type="file"
              accept=".sql,.tar.gz"
              onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
              className="mb-3 block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm"
            />
            <button
              type="button"
              onClick={handleImport}
              disabled={!canImport || processing}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileUp size={16} />
              Importar backup
            </button>
          </div>
        </div>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">Backups almacenados</h2>
            <button
              type="button"
              onClick={loadBackups}
              disabled={!canRead || loading}
              className="text-sm text-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Actualizar lista
            </button>
          </div>

          {!canSeeTable && (
            <p className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
              No tienes permisos para ver el listado de backups.
            </p>
          )}

          {canSeeTable && loading && <p className="text-sm text-gray-500">Cargando backups...</p>}

          {canSeeTable && !loading && backups.length === 0 && (
            <p className="text-sm text-gray-500">No hay backups generados aun.</p>
          )}

          {canSeeTable && !loading && backups.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="px-3 py-2 font-medium">Archivo</th>
                    <th className="px-3 py-2 font-medium">Tipo</th>
                    <th className="px-3 py-2 font-medium">Tamano</th>
                    <th className="px-3 py-2 font-medium">Ultima modificacion</th>
                    <th className="px-3 py-2 font-medium">Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((backup) => (
                    <tr key={backup.filename} className="border-b border-gray-100">
                      <td className="px-3 py-2 text-gray-800">{backup.filename}</td>
                      <td className="px-3 py-2 text-gray-600">{backup.type === 'full' ? 'Completo' : 'Base de datos'}</td>
                      <td className="px-3 py-2 text-gray-600">{bytesToReadable(backup.size)}</td>
                      <td className="px-3 py-2 text-gray-600">{formatUnixDate(backup.modified_at)}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => handleDownload(backup.filename)}
                          disabled={!canDownload || processing}
                          className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Download size={14} />
                          Descargar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </Layout>
  )
}
