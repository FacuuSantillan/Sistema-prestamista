import React, { useState, useEffect } from 'react'
import { X, Calculator } from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'

export default function ModalPrestamo({ isOpen, onClose, onSuccess }) {
  const [provincias, setProvincias] = useState([])
  const [clientes, setClientes] = useState([])
  const [inversionistas, setInversionistas] = useState([])
  const [planes, setPlanes] = useState([])

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const [planSeleccionado, setPlanSeleccionado] = useState('')

  const [formData, setFormData] = useState({
    cliente_id: '',
    inversionista_id: '',
    provincia_id: '',
    monto_prestado: '',
    tasa_interes: '',
    plazo_cuotas: '1',
    frecuencia_pago: 'mensual',
    fecha_inicio: new Date().toISOString().split('T')[0]
  })

  // Cargar datos relacionales desde Supabase
  useEffect(() => {
    if (isOpen) {
      async function loadData() {
        try {
          const [resProvs, resClis, resInvs, resPlanes] = await Promise.all([
            supabase.from('provincias').select('*').order('nombre', { ascending: true }),
            supabase.from('clientes').select('id, nombre_completo, provincia_id').order('nombre_completo', { ascending: true }),
            supabase.from('usuarios').select('id, nombre_completo, provincia_id').order('nombre_completo', { ascending: true }),
            supabase.from('planes_prestamo').select('*').order('monto', { ascending: true })
          ])

          if (resProvs.data) setProvincias(resProvs.data)
          if (resInvs.data) setInversionistas(resInvs.data)

          // Auto-seleccionar primer plan si existe
          if (resPlanes.data && resPlanes.data.length > 0) {
            setPlanes(resPlanes.data)
            const primerPlan = resPlanes.data[0]
            setPlanSeleccionado(primerPlan.id)
            setFormData((prev) => ({
              ...prev,
              monto_prestado: primerPlan.monto.toString(),
              tasa_interes: primerPlan.tasa_interes.toString()
            }))
          } else {
            setPlanSeleccionado('custom')
          }

          if (resClis.data && resClis.data.length > 0) {
            setClientes(resClis.data)
            setFormData((prev) => ({
              ...prev,
              cliente_id: resClis.data[0].id,
              provincia_id: resClis.data[0].provincia_id || (resProvs.data?.[0]?.id || '')
            }))
          } else if (resProvs.data && resProvs.data.length > 0) {
            setFormData((prev) => ({ ...prev, provincia_id: resProvs.data[0].id }))
          }
        } catch (err) {
          console.error('Error al cargar datos del modal préstamo:', err)
        }
      }
      loadData()
    }
  }, [isOpen])

  // Manejar el cambio de Opción de préstamo
  const handlePlanChange = (e) => {
    const value = e.target.value
    setPlanSeleccionado(value)

    if (value === 'custom') {
      setFormData((prev) => ({
        ...prev,
        monto_prestado: '',
        tasa_interes: ''
      }))
      return
    }

    const planEncontrado = planes.find((p) => p.id === value)
    if (planEncontrado) {
      setFormData((prev) => ({
        ...prev,
        monto_prestado: planEncontrado.monto.toString(),
        tasa_interes: planEncontrado.tasa_interes.toString()
      }))
    }
  }

  // Al seleccionar un cliente, asociar su provincia
  const handleClienteChange = (e) => {
    const selectedId = e.target.value
    const clienteEncontrado = clientes.find((c) => c.id === selectedId)

    setFormData((prev) => ({
      ...prev,
      cliente_id: selectedId,
      provincia_id: clienteEncontrado?.provincia_id || prev.provincia_id
    }))
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Cálculos financieros en tiempo real
  const monto = parseFloat(formData.monto_prestado || 0)
  const tasa = parseFloat(formData.tasa_interes || 0)
  const cuotas = parseInt(formData.plazo_cuotas || 1, 10)

  const montoInteres = (monto * tasa) / 100
  const montoTotalDevolver = monto + montoInteres
  const valorCuota = cuotas > 0 ? montoTotalDevolver / cuotas : 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    // Validación previa del monto
    if (isNaN(monto) || monto <= 0) {
      setErrorMsg('Por favor, ingresá un monto de préstamo válido.')
      setLoading(false)
      return
    }

    try {
      // 1. Buscamos el inversionista seleccionado
      const inversorSeleccionado = inversionistas.find(
        (inv) => inv.id === formData.inversionista_id
      )

      // 2. Buscamos el cliente seleccionado
      const clienteSeleccionado = clientes.find(
        (c) => c.id === formData.cliente_id
      )

      // 3. Heredamos la provincia del inversor o la del cliente si es capital propio
      const provinciaIdHeredada =
        inversorSeleccionado?.provincia_id || clienteSeleccionado?.provincia_id || formData.provincia_id || null

      const payload = {
        cliente_id: formData.cliente_id,
        inversionista_id: formData.inversionista_id || null,
        provincia_id: provinciaIdHeredada,
        monto_capital: monto,                             // 👈 Mapeo correcto de monto_prestado
        tasa_interes: tasa,                           // 👈 Agregamos la tasa de interés requerida
        monto_total_pagar: montoTotalDevolver,           // 👈 Mapeo correcto del total calculado
        monto_cuota: valorCuota,
        cantidad_cuotas: cuotas,                         // 👈 Mapeo correcto de plazo_cuotas
        frecuencia: formData.frecuencia_pago || 'mensual',// 👈 Mapeo correcto de frecuencia_pago
        fecha_inicio: formData.fecha_inicio,
        estado: 'activo'
      }

      const { error } = await supabase.from('prestamos').insert([payload])

      if (error) throw error

      if (onSuccess) onSuccess()
      onClose()
    } catch (err) {
      console.error('Error al guardar el préstamo:', err)
      setErrorMsg(err.message || 'No se pudo crear el préstamo.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="w-full max-w-xl rounded-3xl bg-cream p-6 sm:p-8 shadow-2xl border border-line max-h-[92vh] overflow-y-auto">
        
        {/* Cabecera del Modal */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <span className="text-[11px] font-bold tracking-widest uppercase text-[#0d6b63]">
              ALTA DE REGISTRO
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1d2939] mt-0.5">
              Nuevo préstamo
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
          
          {/* 1. Selector de Opciones / Planes Predefinidos */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#0d6b63] mb-1">
              Opción de préstamo
            </label>
            <select
              value={planSeleccionado}
              onChange={handlePlanChange}
              required
              className="w-full rounded-2xl border border-[#0d6b63]/40 bg-white px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0d6b63]/20"
            >
              {planes.length === 0 ? (
                <option value="custom">No hay opciones guardadas (Personalizado)</option>
              ) : (
                planes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} — Monto: ${Number(p.monto).toLocaleString('es-AR')} | Tasa: {p.tasa_interes}%
                  </option>
                ))
              )}
              <option value="custom">Personalizado (Ingresar monto e interés a mano)</option>
            </select>
          </div>

          {/* Si eligió Personalizado, mostramos los inputs de Monto e Interés */}
          {planSeleccionado === 'custom' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Monto prestado ($)
                </label>
                <input
                  type="number"
                  name="monto_prestado"
                  min="1"
                  step="any"
                  required
                  value={formData.monto_prestado}
                  onChange={handleChange}
                  placeholder="Ej. 1000000"
                  className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-[#0d6b63]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tasa de interés (%)
                </label>
                <input
                  type="number"
                  name="tasa_interes"
                  min="0"
                  step="any"
                  required
                  value={formData.tasa_interes}
                  onChange={handleChange}
                  placeholder="20"
                  className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-[#0d6b63]/20"
                />
              </div>
            </div>
          )}

          {/* 2. Fila: Cliente y Inversionista Financiador */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Cliente
              </label>
              <select
                name="cliente_id"
                required
                value={formData.cliente_id}
                onChange={handleClienteChange}
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-[#0d6b63]/20 focus:border-[#0d6b63]"
              >
                {clientes.length === 0 ? (
                  <option value="">No hay clientes registrados</option>
                ) : (
                  clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre_completo}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Inversionista
              </label>
              <select
                name="inversionista_id"
                value={formData.inversionista_id}
                onChange={handleChange}
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-[#0d6b63]/20 focus:border-[#0d6b63]"
              >
                <option value="">Propio (Administrador)</option>
                {inversionistas.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.nombre_completo}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Fila: Fecha de emisión */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Fecha de inicio / emisión
            </label>
            <input
              type="date"
              name="fecha_inicio"
              required
              value={formData.fecha_inicio}
              onChange={handleChange}
              className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-[#0d6b63]/20 focus:border-[#0d6b63]"
            />
          </div>

          {/* 4. Fila: Cantidad de Cuotas y Frecuencia de Pago */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Cantidad de cuotas
              </label>
              <input
                type="number"
                name="plazo_cuotas"
                min="1"
                required
                value={formData.plazo_cuotas}
                onChange={handleChange}
                placeholder="1"
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0d6b63]/20 focus:border-[#0d6b63]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Frecuencia de pago
              </label>
              <select
                name="frecuencia_pago"
                value={formData.frecuencia_pago}
                onChange={handleChange}
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-[#0d6b63]/20 focus:border-[#0d6b63]"
              >
                <option value="diario">Diario</option>
                <option value="semanal">Semanal</option>
                <option value="quincenal">Quincenal</option>
                <option value="mensual">Mensual</option>
              </select>
            </div>
          </div>

          {/* Simulador dinámico de total y cuotas */}
          {monto > 0 && (
            <div className="p-4 rounded-2xl bg-[#0d6b63]/5 border border-[#0d6b63]/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#0d6b63] text-white">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-medium block">
                    Total a devolver ({cuotas} {cuotas === 1 ? 'cuota' : 'cuotas'})
                  </span>
                  <span className="text-lg font-bold text-[#1d2939]">
                    ${montoTotalDevolver.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-500 font-medium block">
                  Valor cuota
                </span>
                <span className="text-base font-bold text-[#0d6b63]">
                  ${valorCuota.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}

          {errorMsg && (
            <p className="text-xs text-red-600 font-semibold bg-red-50 p-2.5 rounded-xl border border-red-200">
              ⚠️ {errorMsg}
            </p>
          )}

          {/* Botones */}
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
              {loading ? 'Guardando...' : 'Guardar préstamo'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}