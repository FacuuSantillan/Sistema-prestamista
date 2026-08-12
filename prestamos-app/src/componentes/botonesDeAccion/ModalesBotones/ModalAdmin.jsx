import React, { useState } from 'react'
import { X, Lock, Mail, ShieldCheck, User } from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'

export default function ModalAdmin({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const [formData, setFormData] = useState({
    nombre_completo: '',
    telefono: '',
    email: '',
    password: ''
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    const emailLimpio = formData.email.trim()

    try {
      // 1. CREAR EL USUARIO EN SUPABASE AUTH
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: emailLimpio,
        password: formData.password.trim(),
        options: {
          data: {
            nombre_completo: formData.nombre_completo,
            rol: 'admin'
          }
        }
      })

      if (authError) {
        throw new Error(`Error en autenticación: ${authError.message}`)
      }

      const nuevoUserId = authData.user?.id

      if (!nuevoUserId) {
        throw new Error('No se pudo obtener el identificador único del administrador.')
      }

      // 2. INSERTAR EL PERFIL CON ROL 'admin' EN LA TABLA 'usuarios'
      const payload = {
        id: nuevoUserId,
        nombre_completo: formData.nombre_completo,
        telefono: formData.telefono,
        rol: 'admin',
        activo: true,
        capital_disponible: 0
      }

      const { error: dbError } = await supabase.from('usuarios').insert([payload])

      if (dbError) throw dbError

      // Reset del formulario
      setFormData({
        nombre_completo: '',
        telefono: '',
        email: '',
        password: ''
      })

      if (onSuccess) onSuccess()
      onClose()
    } catch (err) {
      console.error('Error al crear administrador:', err)
      setErrorMsg(err.message || 'No se pudo crear el administrador. Intentalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs select-none">
      <div className="w-full max-w-lg rounded-3xl bg-cream p-6 sm:p-8 shadow-2xl border border-line">
        
        {/* Cabecera del Modal */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <span className="text-[11px] font-bold tracking-widest uppercase text-[#0d6b63]">
              GESTIÓN DE PERFILES
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1d2939] mt-0.5">
              Nuevo Administrador
            </h2>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="rounded-xl p-2 text-slate-400 hover:bg-black/5 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Nombre Completo */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nombre Completo
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                name="nombre_completo"
                required
                value={formData.nombre_completo}
                onChange={handleChange}
                placeholder="Ej. Carlos Gómez"
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-line bg-white text-sm text-ink placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0d6b63]/20 focus:border-[#0d6b63]"
              />
            </div>
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Teléfono de Contacto
            </label>
            <input
              type="tel"
              name="telefono"
              value={formData.telefono}
              onChange={handleChange}
              placeholder="Ej. 381 1234567"
              className="w-full px-4 py-2.5 rounded-2xl border border-line bg-white text-sm text-ink placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0d6b63]/20 focus:border-[#0d6b63]"
            />
          </div>

          {/* Credenciales de Acceso */}
          <div className="p-4 rounded-2xl bg-white/70 border border-line/80 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0d6b63]">
              <ShieldCheck className="w-4 h-4" />
              <span>Credenciales de Acceso</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Correo Electrónico (Login)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="admin@empresa.com"
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
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-line bg-white text-sm text-ink placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0d6b63]/20 focus:border-[#0d6b63]"
                  />
                </div>
              </div>
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs text-red-600 font-semibold bg-red-50 p-2.5 rounded-xl border border-red-200">
              ⚠️ {errorMsg}
            </p>
          )}

          {/* Botones de Acción */}
          <div className="flex justify-end items-center gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl border border-line bg-white font-bold text-sm text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-2xl bg-[#0d6b63] text-white font-bold text-sm shadow-sm hover:bg-[#0b5a52] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Creando...' : 'Crear Administrador'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}