import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

export default function ModalCliente({ isOpen, onClose, onSuccess }) {
  const [provincias, setProvincias] = useState([])
  const [inversionistas, setInversionistas] = useState([])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const [formData, setFormData] = useState({
    nombre_completo: '',
    telefono: '',
    provincia_id: '',
    origen: 'propio', // 'propio' o 'inversionista'
    inversionista_id: ''
  })

  // Cargar provincias e inversionistas desde Supabase
  useEffect(() => {
    if (isOpen) {
      async function loadData() {
        // Cargar provincias
        const { data: provs } = await supabase
          .from('provincias')
          .select('*')
          .order('nombre', { ascending: true })

        // Cargar inversionistas
        const { data: invs } = await supabase
          .from('usuarios')
          .select('id, nombre_completo')
          .eq('rol', 'inversionista')
          .order('nombre_completo', { ascending: true })

        if (provs && provs.length > 0) {
          setProvincias(provs)
          setFormData((prev) => ({
            ...prev,
            provincia_id: prev.provincia_id || provs[0].id
          }))
        }

        if (invs) {
          setInversionistas(invs)
        }
      }
      loadData()
    }
  }, [isOpen])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => {
      const updated = { ...prev, [name]: value }
      
      // Si cambia el origen a 'propio', limpiamos el inversionista_id
      if (name === 'origen' && value === 'propio') {
        updated.inversionista_id = ''
      }
      // Si cambia a 'inversionista' y no hay uno seleccionado, tomar el primero de la lista
      if (name === 'origen' && value === 'inversionista' && inversionistas.length > 0) {
        updated.inversionista_id = inversionistas[0].id
      }

      return updated
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    // Validación si eligió 'inversionista' pero no seleccionó ninguno
    if (formData.origen === 'inversionista' && !formData.inversionista_id) {
      setErrorMsg('Debes seleccionar un inversionista asignado.')
      setLoading(false)
      return
    }

    try {
      const payload = {
        nombre_completo: formData.nombre_completo,
        telefono: formData.telefono,
        provincia_id: formData.provincia_id,
        // Si el origen es 'propio', inversionista_id queda en null
        inversionista_id: formData.origen === 'propio' ? null : formData.inversionista_id
      }

      const { error } = await supabase.from('clientes').insert([payload])

      if (error) throw error

      // Reset de formulario
      setFormData({
        nombre_completo: '',
        telefono: '',
        provincia_id: provincias[0]?.id || '',
        origen: 'propio',
        inversionista_id: ''
      })

      if (onSuccess) onSuccess()
      onClose()
    } catch (err) {
      console.error('Error al guardar cliente:', err)
      setErrorMsg(err.message || 'No se pudo guardar el cliente. Intentalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="w-full max-w-xl rounded-3xl bg-cream p-6 sm:p-8 shadow-2xl border border-line">
        
        {/* Cabecera del Modal */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <span className="text-[11px] font-bold tracking-widest uppercase text-[#0d6b63]">
              ALTA DE REGISTRO
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1d2939] mt-0.5">
              Nuevo movimiento
            </h2>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="rounded-xl p-2 text-slate-400 hover:bg-black/5 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Tipo de movimiento (Fijo en Cliente) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Tipo de movimiento
            </label>
            <select
              disabled
              value="cliente"
              className="w-full rounded-2xl border border-line bg-white/70 px-4 py-3 text-sm font-medium text-slate-800 cursor-not-allowed"
            >
              <option value="cliente">Cliente</option>
            </select>
          </div>

          {/* Fila 1: Nombre completo y Teléfono */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nombre completo
              </label>
              <input
                type="text"
                name="nombre_completo"
                required
                value={formData.nombre_completo}
                onChange={handleChange}
                placeholder="Ej. María González"
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0d6b63]/20 focus:border-[#0d6b63]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                placeholder="Ej. 381 9876543"
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0d6b63]/20 focus:border-[#0d6b63]"
              />
            </div>
          </div>

          {/* Fila 2: Provincia y Origen del cliente */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Origen del cliente
              </label>
              <select
                name="origen"
                value={formData.origen}
                onChange={handleChange}
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-[#0d6b63]/20 focus:border-[#0d6b63]"
              >
                <option value="propio">Propio (Administrador)</option>
                <option value="inversionista">Inversionista asignado</option>
              </select>
            </div>
          </div>

          {/* Selector condicional: Inversionista Asignado (Solo se muestra si Origen = 'inversionista') */}
          {formData.origen === 'inversionista' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Inversionista asignado
              </label>
              <select
                name="inversionista_id"
                required={formData.origen === 'inversionista'}
                value={formData.inversionista_id}
                onChange={handleChange}
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-[#0d6b63]/20 focus:border-[#0d6b63]"
              >
                {inversionistas.length === 0 ? (
                  <option value="">No hay inversionistas registrados</option>
                ) : (
                  inversionistas.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.nombre_completo}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          {errorMsg && (
            <p className="text-xs text-red-600 font-semibold bg-red-50 p-2.5 rounded-xl border border-red-200">
              ⚠️ {errorMsg}
            </p>
          )}

          {/* Botones de acción */}
          <div className="flex justify-end items-center gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl border border-line bg-white font-bold text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-2xl bg-[#0d6b63] text-white font-bold text-sm shadow-sm hover:bg-[#0b5a52] transition-colors disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar movimiento'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}