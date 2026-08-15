import React, { useState } from 'react'
import { X, PlusCircle } from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient' // Ajustá las barras segun la ubicacion de tu componente

export default function ModalCrearPlan({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    nombre: '',
    monto: '',
    tasa_interes: '',
    plazo_cuotas: '1',
    frecuencia_pago: 'mensual'
  })
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    try {
      const payload = {
        nombre: formData.nombre,
        monto: parseFloat(formData.monto),
        tasa_interes: parseFloat(formData.tasa_interes),
        plazo_cuotas: parseInt(formData.plazo_cuotas, 10),
        creado_por: user.id, // 👈 Aquí se guarda quién ejecutó la acción
        frecuencia_pago: formData.frecuencia_pago
      }

      const { error } = await supabase.from('planes_prestamo').insert([payload])
      if (error) throw error

      setFormData({ nombre: '', monto: '', tasa_interes: '', plazo_cuotas: '1', frecuencia_pago: 'mensual' })
      if (onSuccess) onSuccess()
      onClose()
    } catch (err) {
      console.error(err)
      setErrorMsg(err.message || 'Error al guardar la opción de préstamo.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-3xl bg-cream p-6 shadow-2xl border border-line">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold font-serif text-[#1d2939]">Nueva opción de préstamo</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nombre de la opción</label>
            <input
              type="text"
              name="nombre"
              required
              placeholder="Ej. Préstamo 1"
              value={formData.nombre}
              onChange={handleChange}
              className="w-full rounded-2xl border border-line px-4 py-2.5 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Monto ($)</label>
              <input
                type="number"
                name="monto"
                required
                placeholder="1000000"
                value={formData.monto}
                onChange={handleChange}
                className="w-full rounded-2xl border border-line px-4 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tasa de interés (%)</label>
              <input
                type="number"
                name="tasa_interes"
                required
                placeholder="20"
                value={formData.tasa_interes}
                onChange={handleChange}
                className="w-full rounded-2xl border border-line px-4 py-2.5 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Cuotas</label>
              <input
                type="number"
                name="plazo_cuotas"
                min="1"
                required
                value={formData.plazo_cuotas}
                onChange={handleChange}
                className="w-full rounded-2xl border border-line px-4 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Frecuencia</label>
              <select
                name="frecuencia_pago"
                value={formData.frecuencia_pago}
                onChange={handleChange}
                className="w-full rounded-2xl border border-line px-4 py-2.5 text-sm"
              >
                <option value="diario">Diario</option>
                <option value="semanal">Semanal</option>
                <option value="quincenal">Quincenal</option>
                <option value="mensual">Mensual</option>
              </select>
            </div>
          </div>

          {errorMsg && <p className="text-xs text-red-600 font-medium">{errorMsg}</p>}

          <div className="flex justify-end gap-2 pt-3">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-line text-xs font-bold">Cancelar</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-xl bg-[#0d6b63] text-white text-xs font-bold">
              {loading ? 'Guardando...' : 'Guardar opción'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}