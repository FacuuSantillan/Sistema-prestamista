import React, { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  RefreshCw,
  Users,
  ChevronRight,
  Calendar
} from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export default function PanoramaOperativo({ 
  onAbrirDirectorioInversionistas,   
  rolUsuario = "admin"
 }) {
  
  const [loading, setLoading] = useState(true)
  const fechaActual = new Date()

  // Estados de Filtro de Período
  const [filtroPeriodo, setFiltroPeriodo] = useState('historico') // 'historico' | 'mes'
  const [mesSeleccionado, setMesSeleccionado] = useState(fechaActual.getMonth() + 1) // 1 - 12
  const [anioSeleccionado, setAnioSeleccionado] = useState(fechaActual.getFullYear())

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
      // 1. Obtener SOLO usuarios con rol 'inversionista' y estado ACTIVOS (activo = true)
      const { data: inversionistas, error: errInv } = await supabase
        .from('usuarios')
        .select('id, capital_disponible, activo, rol')
        .eq('activo', true)
        .eq('rol', 'inversionista') // 🔴 FILTRO CLAVE: Excluye 'admin', 'owner' y 'cliente'

      if (errInv) console.warn('Aviso al cargar inversionistas activos:', errInv.message)

      const listaInversoresHabilitados = inversionistas || []

      // Capital total disponible de la caja exclusiva de inversores
      const capitalTotalDisponible = listaInversoresHabilitados.reduce(
        (acc, inv) => acc + Number(inv.capital_disponible || 0), 0
      )
      
      // Cantidad exacta de perfiles con rol 'inversionista'
      const inversoresActivos = listaInversoresHabilitados.length

      // 2. Obtener todos los préstamos
      const { data: prestamos, error: errP } = await supabase
        .from('prestamos')
        .select('*')

      if (errP) console.warn('Aviso al cargar préstamos:', errP.message)

      // 3. Obtener todos los pagos
      const { data: pagos, error: errPagos } = await supabase
        .from('pagos')
        .select('*')

      if (errPagos) console.warn('Aviso al cargar pagos:', errPagos.message)

      let prestamosList = prestamos || []
      let pagosList = pagos || []

      // 🔴 FILTRADO POR FECHA (SI SE ELIGIÓ UN MES ESPECÍFICO)
      if (filtroPeriodo === 'mes') {
        prestamosList = prestamosList.filter((p) => {
          const fechaStr = p.created_at || p.fecha_inicio
          if (!fechaStr) return false
          const f = new Date(fechaStr)
          return f.getFullYear() === Number(anioSeleccionado) && (f.getMonth() + 1) === Number(mesSeleccionado)
        })

        pagosList = pagosList.filter((p) => {
          const fechaStr = p.created_at || p.fecha_pago
          if (!fechaStr) return false
          const f = new Date(fechaStr)
          return f.getFullYear() === Number(anioSeleccionado) && (f.getMonth() + 1) === Number(mesSeleccionado)
        })
      }

      // --- CÁLCULOS GENERALES SEGÚN EL FILTRO ---
      const totalPrestado = prestamosList.reduce((acc, p) => acc + Number(p.monto_capital || p.monto || 0), 0)
      const totalADevolver = prestamosList.reduce((acc, p) => acc + Number(p.monto_total_pagar || p.monto_total || 0), 0)
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
  }, [filtroPeriodo, mesSeleccionado, anioSeleccionado])

  return (
    <section className="w-[95%] mx-auto space-y-4 my-6">
      
      {/* Cabecera y Selector de Período */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold tracking-widest uppercase text-[#0d6b63]">
            ESTADÍSTICAS GENERALES
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1d2939] mt-0.5">
            PANORAMA OPERATIVO
          </h2>
        </div>

        {/* CONTROLES DE FILTRADO POR MES / AÑO */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-white p-1 rounded-2xl border border-line shadow-xs">
            <button
              onClick={() => setFiltroPeriodo('historico')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filtroPeriodo === 'historico' ? 'bg-[#0d6b63] text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Histórico
            </button>
            <button
              onClick={() => setFiltroPeriodo('mes')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filtroPeriodo === 'mes' ? 'bg-[#0d6b63] text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Por Mes
            </button>
          </div>

          {/* Desplegables de Mes y Año cuando 'Por Mes' está activo */}
          {filtroPeriodo === 'mes' && (
            <>
              <select
                value={mesSeleccionado}
                onChange={(e) => setMesSeleccionado(Number(e.target.value))}
                className="rounded-2xl border border-line bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0d6b63]/20 cursor-pointer shadow-xs"
              >
                {MESES.map((m, idx) => (
                  <option key={idx} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={anioSeleccionado}
                onChange={(e) => setAnioSeleccionado(Number(e.target.value))}
                className="rounded-2xl border border-line bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0d6b63]/20 cursor-pointer shadow-xs"
              >
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
                <option value={2024}>2024</option>
              </select>
            </>
          )}

          <button
            onClick={cargarMetricas}
            disabled={loading}
            title="Recargar datos"
            className="flex items-center gap-2 p-2 rounded-2xl bg-white border border-line text-xs font-bold text-slate-600 hover:text-[#0d6b63] hover:border-[#0d6b63] transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#0d6b63]' : ''}`} />
          </button>
        </div>
      </div>

      {/* GRILLA PRINCIPAL DE MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* 1. Capital Total Invertido / Disponible */}
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
            {loading ? (
              <div className="space-y-2 py-1">
                <div className="h-8 w-36 bg-slate-200/80 rounded-xl animate-pulse" />
                <div className="h-3 w-28 bg-slate-100 rounded-md animate-pulse" />
              </div>
            ) : (
              <>
                <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  ${metricas.capitalTotalDisponible.toLocaleString('es-AR')}
                </p>
                <span className="text-[11px] font-medium text-slate-400 mt-1 block">
                  Suma de inversionistas habilitados
                </span>
              </>
            )}
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
            {loading ? (
              <div className="space-y-2 py-1">
                <div className="h-8 w-36 bg-emerald-100/60 rounded-xl animate-pulse" />
                <div className="h-3 w-28 bg-slate-100 rounded-md animate-pulse" />
              </div>
            ) : (
              <>
                <p className="text-2xl sm:text-3xl font-bold text-emerald-700 tracking-tight">
                  +${metricas.interesGenerado.toLocaleString('es-AR')}
                </p>
                <span className="text-[11px] font-medium text-emerald-600/80 mt-1 block">
                  {filtroPeriodo === 'mes' ? `${MESES[mesSeleccionado - 1]} ${anioSeleccionado}` : 'Rendimiento acumulado'}
                </span>
              </>
            )}
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
            {loading ? (
              <div className="space-y-2 py-1">
                <div className="h-8 w-36 bg-blue-100/60 rounded-xl animate-pulse" />
                <div className="h-3 w-28 bg-slate-100 rounded-md animate-pulse" />
              </div>
            ) : (
              <>
                <p className="text-2xl sm:text-3xl font-bold text-blue-800 tracking-tight">
                  ${metricas.totalCobrado.toLocaleString('es-AR')}
                </p>
                <span className="text-[11px] font-medium text-blue-600 mt-1 block">
                  {filtroPeriodo === 'mes' ? `Cobros de ${MESES[mesSeleccionado - 1]}` : 'Recaudación acumulada'}
                </span>
              </>
            )}
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
            {loading ? (
              <div className="space-y-2 py-1">
                <div className="h-8 w-36 bg-amber-100/60 rounded-xl animate-pulse" />
                <div className="h-3 w-28 bg-slate-100 rounded-md animate-pulse" />
              </div>
            ) : (
              <>
                <p className="text-2xl sm:text-3xl font-bold text-amber-700 tracking-tight">
                  ${metricas.balancePendiente.toLocaleString('es-AR')}
                </p>
                <span className="text-[11px] font-medium text-amber-600/80 mt-1 block">
                  {filtroPeriodo === 'mes' ? `Por cobrar de ${MESES[mesSeleccionado - 1]}` : 'Por cobrar en mercado'}
                </span>
              </>
            )}
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
              {loading ? (
                <div className="space-y-1.5 mt-1">
                  <div className="h-7 w-48 bg-slate-200/80 rounded-xl animate-pulse" />
                  <div className="h-3 w-64 bg-slate-100 rounded-md animate-pulse" />
                </div>
              ) : (
                <>
                  <p className="text-2xl font-bold text-slate-900 mt-0.5">
                    {metricas.inversoresActivos} {metricas.inversoresActivos === 1 ? 'Inversor habilitado' : 'Inversores habilitados'}
                  </p>
                  <span className="text-xs text-slate-400 block mt-0.5">
                    Hacé clic para gestionar perfiles, altas y deshabilitaciones
                  </span>
                </>
              )}
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