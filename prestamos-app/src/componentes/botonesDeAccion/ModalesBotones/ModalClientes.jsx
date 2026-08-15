import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'

export default function ModalCliente({ isOpen, onClose, onSuccess, usuarioLogueado = null }) {
  const [inversionistas, setInversionistas] = useState([])
  const [provincias, setProvincias] = useState([])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const [formData, setFormData] = useState({
    nombre_completo: '',
    telefono: '',
    origen: 'propio',
    inversionista_id: '',
    provincia_id: ''
  })

  useEffect(() => {
    if (!isOpen) return

    setFormData({
      nombre_completo: '',
      telefono: '',
      origen: 'propio',
      inversionista_id: '',
      provincia_id: ''
    })
    setErrorMsg('')

    async function fetchInicial() {
      try {
        // 1. Cargar Provincias
        const { data: provData } = await supabase
          .from('provincias')
          .select('*')
          .order('nombre', { ascending: true })

        setProvincias(provData || [])
        if (provData && provData.length > 0) {
          setFormData((prev) => ({ ...prev, provincia_id: provData[0].id }))
        }

        // 2. Cargar Inversionistas desde la tabla 'usuarios'
        const { data: invData, error: errInv } = await supabase
          .from('usuarios')
          .select('id, nombre_completo, rol, activo')
          .order('nombre_completo', { ascending: true })

        if (errInv) {
          console.error('Error al consultar la tabla usuarios:', errInv.message)
        } else {
          const inversionistasValidos = (invData || []).filter((u) => {
            const esActivo = u.activo !== false
            const esInversor = u.rol ? u.rol.toLowerCase() === 'inversionista' : true
            return esActivo && esInversor
          })

          setInversionistas(inversionistasValidos)

          if (inversionistasValidos.length > 0) {
            setFormData((prev) => ({ ...prev, inversionista_id: inversionistasValidos[0].id }))
          }
        }

      } catch (err) {
        console.error('Error al cargar datos iniciales:', err)
      }
    }

    fetchInicial()
  }, [isOpen])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    if (!formData.nombre_completo.trim()) {
      setErrorMsg('El nombre completo es obligatorio.')
      setLoading(false)
      return
    }

    if (formData.origen === 'inversionista' && !formData.inversionista_id) {
      setErrorMsg('Debes seleccionar un inversionista asignado.')
      setLoading(false)
      return
    }

    try {
      // 💡 1. OBTENER EL USUARIO AUTENTICADO DE FORMA SEGURA
      let usuarioId = usuarioLogueado?.id
      if (!usuarioId) {
        const { data: authUserResp } = await supabase.auth.getUser()
        usuarioId = authUserResp?.user?.id || null
      }

      const payload = {
        nombre_completo: formData.nombre_completo.trim(),
        telefono: formData.telefono.trim() || null,
        creado_por: usuarioId, // 👈 Ahora utiliza usuarioId correctamente definido
        inversionista_id: formData.origen === 'inversionista' && formData.inversionista_id ? formData.inversionista_id : null,
        provincia_id: formData.provincia_id || null,
        activo: true
      }

      const { error } = await supabase.from('clientes').insert([payload])

      if (error) throw error

      if (onSuccess) onSuccess()
      onClose()
    } catch (err) {
      console.error('Error al guardar cliente:', err)
      setErrorMsg(err.message || 'No se pudo guardar el cliente.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs select-none">
      <div className="w-full max-w-xl rounded-3xl bg-cream p-6 sm:p-8 shadow-2xl border border-line">
        
        {/* Cabecera */}
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
            className="rounded-xl p-2 text-slate-400 hover:bg-black/5 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
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
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0d6b63]/20 focus:border-[#0d6b63]"
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
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0d6b63]/20 focus:border-[#0d6b63]"
              />
            </div>
          </div>

          {/* Fila: Origen del cliente y Provincia */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Origen del cliente
              </label>
              <select
                name="origen"
                value={formData.origen}
                onChange={handleChange}
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0d6b63]/20 focus:border-[#0d6b63] cursor-pointer"
              >
                <option value="propio">Propio (Administrador)</option>
                <option value="inversionista">Inversionista asignado</option>
              </select>
            </div>

            {provincias.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Provincia
                </label>
                <select
                  name="provincia_id"
                  value={formData.provincia_id}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0d6b63]/20 focus:border-[#0d6b63] cursor-pointer"
                >
                  <option value="">Sin especificar</option>
                  {provincias.map((prov) => (
                    <option key={prov.id} value={prov.id}>
                      {prov.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Inversionista Asignado */}
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
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0d6b63]/20 focus:border-[#0d6b63] cursor-pointer"
              >
                {inversionistas.length === 0 ? (
                  <option value="">No hay inversionistas registrados en la tabla usuarios</option>
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

          <div className="flex justify-end items-center gap-3 pt-4">
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
              {loading ? 'Guardando...' : 'Guardar movimiento'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}