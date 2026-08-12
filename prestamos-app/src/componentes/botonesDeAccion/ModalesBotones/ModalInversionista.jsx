import React, { useState, useEffect } from 'react'
import { X, Lock, Mail, UserCheck } from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'

export default function ModalInversionista({ isOpen, onClose, onSuccess }) {
  const [provincias, setProvincias] = useState([])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const [formData, setFormData] = useState({
    nombre_completo: '',
    telefono: '',
    email: '',
    password: '',
    provincia_id: '',
    capital_disponible: ''
  })

  // Cargar lista de provincias desde Supabase
  useEffect(() => {
    if (isOpen) {
      async function loadProvincias() {
        const { data, error } = await supabase
          .from('provincias')
          .select('*')
          .order('nombre', { ascending: true })

        if (!error && data) {
          setProvincias(data)
          if (data.length > 0) {
            setFormData((prev) => ({ ...prev, provincia_id: data[0].id }))
          }
        }
      }
      loadProvincias()
    }
  }, [isOpen])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    try {
      let nuevoUserId = null

      // 1. SI SE INGRESÓ EMAIL Y PASSWORD -> CREAR USUARIO EN SUPABASE AUTH
      if (formData.email.trim() && formData.password.trim()) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email.trim(),
          password: formData.password.trim(),
          options: {
            data: {
              nombre_completo: formData.nombre_completo,
              rol: 'inversionista'
            }
          }
        })

        if (authError) {
          throw new Error(`Error de credenciales: ${authError.message}`)
        }

        nuevoUserId = authData.user?.id
      }

      // 2. REGISTRAR EL PERFIL EN LA TABLA 'usuarios'
      const payload = {
        nombre_completo: formData.nombre_completo,
        telefono: formData.telefono,
        provincia_id: formData.provincia_id,
        capital_disponible: parseFloat(formData.capital_disponible || 0),
        rol: 'inversionista',
        activo: true
      }

      // Si se creó en Auth, vinculamos el UUID
      if (nuevoUserId) {
        payload.id = nuevoUserId
      }

      const { error: dbError } = await supabase.from('usuarios').insert([payload])

      if (dbError) throw dbError

      // Reset del formulario
      setFormData({
        nombre_completo: '',
        telefono: '',
        email: '',
        password: '',
        provincia_id: provincias[0]?.id || '',
        capital_disponible: '',
      })

      if (onSuccess) onSuccess()
      onClose()
    } catch (err) {
      console.error('Error al guardar inversionista:', err)
      setErrorMsg(err.message || 'No se pudo crear el inversionista. Intentalo de nuevo.')
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
              ALTA DE INVERSIONISTA
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1d2939] mt-0.5">
              Nuevo Inversor
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
                placeholder="Ej. María Salcedo"
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
                placeholder="Ej. 381 1234567"
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0d6b63]/20 focus:border-[#0d6b63]"
              />
            </div>
          </div>

          {/* SECCIÓN ACCESO AL SISTEMA (Email y Password) */}
          <div className="p-4 rounded-2xl bg-white/60 border border-line/80 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0d6b63]">
              <UserCheck className="w-4 h-4" />
              <span>Credenciales para Inicio de Sesión</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Correo Electrónico (Login)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="inversor@correo.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-line bg-white text-sm text-ink placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0d6b63]/20 focus:border-[#0d6b63]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Contraseña Inicial
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-line bg-white text-sm text-ink placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0d6b63]/20 focus:border-[#0d6b63]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Fila 2: Provincia asignada y Capital disponible */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Provincia asignada
              </label>
              <select
                name="provincia_id"
                required
                value={formData.provincia_id}
                onChange={handleChange}
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-[#0d6b63]/20 focus:border-[#0d6b63]"
              >
                {provincias.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Capital Inicial a Invertir ($)
              </label>
              <input
                type="number"
                name="capital_disponible"
                min="0"
                step="any"
                required
                value={formData.capital_disponible}
                onChange={handleChange}
                placeholder="0"
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0d6b63]/20 focus:border-[#0d6b63]"
              />
            </div>
          </div>

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
              {loading ? 'Guardando...' : 'Crear Inversionista'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}