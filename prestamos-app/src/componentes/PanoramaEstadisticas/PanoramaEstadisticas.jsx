import React, { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  RefreshCw,
  Users,
  ChevronRight
} from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

export default function PanoramaOperativo({ onAbrirDirectorioInversionistas }) {
  const [loading, setLoading] = useState(true)
  const [metricas, setMetricas] = useState({
    capitalTotalDisponible: 0, // Suma de capital_disponible SOLO de inversionistas HABILITADOS
    interesGenerado: 0,        // Ganancia total por intereses
    totalCobrado: 0,           // Dinero ingresado por pagos
    balancePendiente: 0,       // Saldo restante por cobrar
    inversoresActivos: 0       // Cantidad de inversionistas activos
  })

  // Función para cargar/recalcular métricas
  const cargarMetricas = async () => {
    setLoading(true)
    try {
      // 1. Obtener solo usuarios/inversionistas ACTIVOS (activo = true)
      const { data: inversionistas, error: errInv } = await supabase
        .from('usuarios')
        .select('id, capital_disponible, activo')
        .eq('activo', true) // 👈 Filtro clave: Excluye deshabilitados

      if (errInv) console.warn('Aviso al cargar usuarios activos:', errInv.message)

      const listaInversoresHabilitados = inversionistas || []

      // Sumar capital disponible solo de la red activa
      const capitalTotalDisponible = listaInversoresHabilitados.reduce(
        (acc, inv) => acc + Number(inv.capital_disponible || 0), 0
      )

      const inversoresActivos = listaInversoresHabilitados.length

      // 2. Obtener todos los préstamos
      const { data: prestamos, error: errP } = await supabase
        .from('prestamos')
        .select('*')

      if (errP) throw errP

      // 3. Obtener todos los pagos
      const { data: pagos, error: errPagos } = await supabase
        .from('pagos')
        .select('*')

      if (errPagos) throw errPagos

      const prestamosList = prestamos || []
      const pagosList = pagos || []

      // --- CÁLCULOS GENERALES ---
      const totalPrestado = prestamosList.reduce((acc, p) => acc + Number(p.monto_capital || 0), 0)
      const totalADevolver = prestamosList.reduce((acc, p) => acc + Number(p.monto_total_pagar || 0), 0)
      const interesGenerado = Math.max(0, totalADevolver - totalPrestado)

      const totalCobrado = pagosList.reduce((acc, p) => acc + Number(p.monto_cobrado || p.monto_pago || 0), 0)
      const balancePendiente = Math.max(0, totalADevolver - totalCobrado)

      setMetricas({
        capitalTotalDisponible,
        interesGenerado,
        totalCobrado,
        balancePendiente,
        inversoresActivos
      })

    } catch (err) {
      console.error('Error al cargar métricas del panorama operativo:', err)
    } finally {
      setLoading(false)
    }
  }

  // Carga inicial y suscripción a cambios en tiempo real
  useEffect(() => {
    cargarMetricas()

    const canalRealtime = supabase
      .channel('schema-panorama-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prestamos' }, () => cargarMetricas())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pagos' }, () => cargarMetricas())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'usuarios' }, () => cargarMetricas())
      .subscribe()

    return () => {
      supabase.removeChannel(canalRealtime)
    }
  }, [])

  return (
    <section className="w-[95%] mx-auto space-y-4 my-6">
      
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold tracking-widest uppercase text-[#0d6b63]">
            PANORAMA OPERATIVO
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1d2939] mt-0.5">
            Números que importan
          </h2>
        </div>

        <button
          onClick={cargarMetricas}
          disabled={loading}
          title="Recargar datos"
          className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-line text-xs font-bold text-slate-600 hover:text-[#0d6b63] hover:border-[#0d6b63] transition-all cursor-pointer shadow-xs disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Actualizar</span>
        </button>
      </div>

      {/* GRILLA PRINCIPAL DE MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* 1. Capital Total Disponible (SOLO HABILITADOS) */}
        <div className="p-5 rounded-3xl bg-white border border-line shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              CAPITAL TOTAL INVERTIDO
            </span>
            <div className="p-2.5 rounded-2xl bg-slate-100 text-slate-700">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              ${metricas.capitalTotalDisponible.toLocaleString('es-AR')}
            </p>
            <span className="text-[11px] font-medium text-slate-400 mt-1 block">
              Suma de inversionistas habilitados
            </span>
          </div>
        </div>

        {/* 2. Interés Generado */}
        <div className="p-5 rounded-3xl bg-white border border-line shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              INTERÉS GENERADO
            </span>
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-bold text-emerald-700 tracking-tight">
              +${metricas.interesGenerado.toLocaleString('es-AR')}
            </p>
            <span className="text-[11px] font-medium text-emerald-600/80 mt-1 block">
              Rendimiento sobre capital
            </span>
          </div>
        </div>

        {/* 3. Total Cobrado */}
        <div className="p-5 rounded-3xl bg-white border border-line shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              TOTAL COBRADO
            </span>
            <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-bold text-blue-800 tracking-tight">
              ${metricas.totalCobrado.toLocaleString('es-AR')}
            </p>
            <span className="text-[11px] font-medium text-blue-600 mt-1 block">
              Recaudación acumulada
            </span>
          </div>
        </div>

        {/* 4. Balance Pendiente */}
        <div className="p-5 rounded-3xl bg-white border border-line shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              BALANCE PENDIENTE
            </span>
            <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-bold text-amber-700 tracking-tight">
              ${metricas.balancePendiente.toLocaleString('es-AR')}
            </p>
            <span className="text-[11px] font-medium text-amber-600/80 mt-1 block">
              Por cobrar en mercado
            </span>
          </div>
        </div>

      </div>

      {/* FILA SECUNDARIA: Inversores Activos Habilitados */}
      <div className="pt-1">
        <div 
          onClick={onAbrirDirectorioInversionistas}
          className="p-5 rounded-3xl bg-white border border-line shadow-xs hover:border-[#0d6b63] hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-[#0d6b63]/10 text-[#0d6b63] group-hover:bg-[#0d6b63] group-hover:text-white transition-colors">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                INVERSORES ACTIVOS Y HABILITADOS
              </span>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">
                {metricas.inversoresActivos} {metricas.inversoresActivos === 1 ? 'Inversor habilitado' : 'Inversores habilitados'}
              </p>
              <span className="text-xs text-slate-400 block mt-0.5">
                Hacé clic para gestionar perfiles, altas y deshabilitaciones
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-[#0d6b63] bg-[#0d6b63]/5 px-4 py-2 rounded-2xl group-hover:bg-[#0d6b63] group-hover:text-white transition-all">
            <span>Ver Inversores</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>

    </section>
  )
}