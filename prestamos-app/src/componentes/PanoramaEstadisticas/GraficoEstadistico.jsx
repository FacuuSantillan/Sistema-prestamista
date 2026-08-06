import React, { useState, useEffect } from 'react'
import { RefreshCw } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts'
import { supabase } from '../../lib/supabaseClient'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export default function GraficoEstadistico() {
  const [modo, setModo] = useState('mensual') // 'mensual' | 'anual'
  const fechaActual = new Date()
  const [anioSeleccionado, setAnioSeleccionado] = useState(fechaActual.getFullYear())
  const [mesSeleccionado, setMesSeleccionado] = useState(fechaActual.getMonth() + 1) // 1 a 12

  const [datosGrafico, setDatosGrafico] = useState([])
  const [totalesPeriodo, setTotalesPeriodo] = useState({
    clientes: 0,
    prestamos: 0,
    interes: 0
  })
  const [loading, setLoading] = useState(true)

  // Cargar y procesar datos desde Supabase
  const cargarEstadisticas = async () => {
    setLoading(true)
    try {
      // 1. Cargar Clientes (Se usa select('*') para evitar error 400 por columnas inexistentes)
      const { data: clientes, error: errClientes } = await supabase
        .from('clientes')
        .select('*')

      if (errClientes) console.warn('Aviso al cargar clientes para estadísticas:', errClientes.message)

      // 2. Cargar Préstamos
      const { data: prestamos, error: errPrestamos } = await supabase
        .from('prestamos')
        .select('*')

      if (errPrestamos) console.warn('Aviso al cargar préstamos para estadísticas:', errPrestamos.message)

      const listaClientes = clientes || []
      const listaPrestamos = prestamos || []

      if (modo === 'anual') {
        // --- MODO ANUAL: 12 barras (un mes por barra) ---
        const desgloseAnual = MESES.map((nombreMes, index) => {
          const numMes = index + 1

          // Filtrar clientes creados en este año y mes
          const cantClientes = listaClientes.filter((c) => {
            const fechaStr = c.created_at || c.creado_en
            if (!fechaStr) return false
            const f = new Date(fechaStr)
            return f.getFullYear() === Number(anioSeleccionado) && (f.getMonth() + 1) === numMes
          }).length

          // Filtrar préstamos de este año y mes
          const prestamosMes = listaPrestamos.filter((p) => {
            const fechaStr = p.created_at || p.fecha_inicio
            if (!fechaStr) return false
            const f = new Date(fechaStr)
            return f.getFullYear() === Number(anioSeleccionado) && (f.getMonth() + 1) === numMes
          })

          const cantPrestamos = prestamosMes.length
          const interesMes = prestamosMes.reduce((acc, p) => {
            const capital = Number(p.monto_capital || p.monto || 0)
            const totalPagar = Number(p.monto_total_pagar || p.monto_total || 0)
            return acc + Math.max(0, totalPagar - capital)
          }, 0)

          return {
            periodo: nombreMes.substring(0, 3), // Ene, Feb, Mar...
            clientes: cantClientes,
            prestamos: cantPrestamos,
            interes: interesMes
          }
        })

        setDatosGrafico(desgloseAnual)

        // Calcular totales acumulados del año
        setTotalesPeriodo({
          clientes: desgloseAnual.reduce((acc, d) => acc + d.clientes, 0),
          prestamos: desgloseAnual.reduce((acc, d) => acc + d.prestamos, 0),
          interes: desgloseAnual.reduce((acc, d) => acc + d.interes, 0)
        })

      } else {
        // --- MODO MENSUAL: Comparativa de semanas del mes seleccionado ---
        const diasEnMes = new Date(anioSeleccionado, mesSeleccionado, 0).getDate()
        const semanas = [
          { label: 'Sem 1 (1-7)', min: 1, max: 7 },
          { label: 'Sem 2 (8-14)', min: 8, max: 14 },
          { label: 'Sem 3 (15-21)', min: 15, max: 21 },
          { label: 'Sem 4 (22+)', min: 22, max: diasEnMes }
        ]

        const desgloseMensual = semanas.map((sem) => {
          const cantClientes = listaClientes.filter((c) => {
            const fechaStr = c.created_at || c.creado_en
            if (!fechaStr) return false
            const f = new Date(fechaStr)
            const dia = f.getDate()
            return f.getFullYear() === Number(anioSeleccionado) &&
                   (f.getMonth() + 1) === Number(mesSeleccionado) &&
                   dia >= sem.min && dia <= sem.max
          }).length

          const prestamosSem = listaPrestamos.filter((p) => {
            const fechaStr = p.created_at || p.fecha_inicio
            if (!fechaStr) return false
            const f = new Date(fechaStr)
            const dia = f.getDate()
            return f.getFullYear() === Number(anioSeleccionado) &&
                   (f.getMonth() + 1) === Number(mesSeleccionado) &&
                   dia >= sem.min && dia <= sem.max
          })

          const cantPrestamos = prestamosSem.length
          const interesSem = prestamosSem.reduce((acc, p) => {
            const capital = Number(p.monto_capital || p.monto || 0)
            const totalPagar = Number(p.monto_total_pagar || p.monto_total || 0)
            return acc + Math.max(0, totalPagar - capital)
          }, 0)

          return {
            periodo: sem.label,
            clientes: cantClientes,
            prestamos: cantPrestamos,
            interes: interesSem
          }
        })

        setDatosGrafico(desgloseMensual)

        setTotalesPeriodo({
          clientes: desgloseMensual.reduce((acc, d) => acc + d.clientes, 0),
          prestamos: desgloseMensual.reduce((acc, d) => acc + d.prestamos, 0),
          interes: desgloseMensual.reduce((acc, d) => acc + d.interes, 0)
        })
      }

    } catch (err) {
      console.error('Error al generar estadísticas:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarEstadisticas()
  }, [modo, mesSeleccionado, anioSeleccionado])

  // Custom Tooltip para formatear montos en pesos
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3.5 rounded-2xl border border-line shadow-xl text-xs space-y-1.5">
          <p className="font-bold text-slate-900 border-b border-line pb-1">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <span className="font-semibold flex items-center gap-1.5" style={{ color: entry.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name}:
              </span>
              <span className="font-bold text-slate-900">
                {entry.dataKey === 'interes'
                  ? `$${Number(entry.value).toLocaleString('es-AR')}`
                  : entry.value}
              </span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <section className="w-[95%] mx-auto space-y-4 my-8">
      
      {/* CABECERA Y FILTROS */}
      <div className="p-6 rounded-3xl bg-white border border-line shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold tracking-widest uppercase text-[#0d6b63]">
            PANEL MÉTRICO
          </span>
          <h2 className="text-2xl font-serif font-bold text-[#1d2939] mt-0.5">
            Rendimiento y Métricas
          </h2>
        </div>

        {/* SELECTORES DE PERÍODO */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Selector Modo (Mensual vs Anual) */}
          <div className="flex items-center bg-cream/6
          0 p-1 rounded-2xl border border-line">
            <button
              onClick={() => setModo('mensual')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                modo === 'mensual' ? 'bg-[#0d6b63] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Vista Mensual
            </button>
            <button
              onClick={() => setModo('anual')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                modo === 'anual' ? 'bg-[#0d6b63] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Vista Anual
            </button>
          </div>

          {/* Selector de Mes (Solo visible en modo mensual) */}
          {modo === 'mensual' && (
            <select
              value={mesSeleccionado}
              onChange={(e) => setMesSeleccionado(Number(e.target.value))}
              className="rounded-2xl border border-line bg-cream/30 px-3.5 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0d6b63]/20 cursor-pointer"
            >
              {MESES.map((m, idx) => (
                <option key={idx} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>
          )}

          {/* Selector de Año */}
          <select
            value={anioSeleccionado}
            onChange={(e) => setAnioSeleccionado(Number(e.target.value))}
            className="rounded-2xl border border-line bg-cream/30 px-3.5 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0d6b63]/20 cursor-pointer"
          >
            <option value={2026}>2026</option>
            <option value={2025}>2025</option>
            <option value={2024}>2024</option>
          </select>

          <button
            onClick={cargarEstadisticas}
            disabled={loading}
            title="Recargar gráfico"
            className="p-2 rounded-2xl bg-white border border-line text-slate-600 hover:text-[#0d6b63] hover:border-[#0d6b63] transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* RESUMEN DE TARJETAS DEL PERÍODO */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-line shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">CLIENTES CREADOS</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{totalesPeriodo.clientes} Registros</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-line shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">PRÉSTAMOS OTORGADOS</span>
          <p className="text-xl font-bold text-[#0d6b63] mt-1">{totalesPeriodo.prestamos} Préstamos</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-line shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">INTERÉS GENERADO</span>
          <p className="text-xl font-bold text-emerald-700 mt-1">
            +${totalesPeriodo.interes.toLocaleString('es-AR')}
          </p>
        </div>
      </div>

      {/* ÁREA DEL GRÁFICO */}
      <div className="p-6 rounded-3xl bg-white border border-line shadow-xs h-[420px]">
        {loading ? (
          <div className="h-full flex items-center justify-center text-xs font-medium text-slate-400">
            Cargando estadísticas...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={datosGrafico}
              margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="periodo" tickLine={false} style={{ fontSize: '12px', fontWeight: 'bold', fill: '#64748b' }} />
              
              {/* Eje Y primario (para cantidades) */}
              <YAxis yAxisId="left" orientation="left" stroke="#64748b" tickLine={false} style={{ fontSize: '11px' }} />

              {/* Eje Y secundario (para montos de interés en dinero) */}
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                stroke="#10b981" 
                tickLine={false} 
                style={{ fontSize: '11px' }}
                tickFormatter={(val) => `$${val.toLocaleString('es-AR')}`}
              />

              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '15px', fontSize: '12px', fontWeight: 'bold' }} />

              {/* Barra 1: Clientes */}
              <Bar
                yAxisId="left"
                dataKey="clientes"
                name="Clientes Creados"
                fill="#1d2939"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />

              {/* Barra 2: Préstamos */}
              <Bar
                yAxisId="left"
                dataKey="prestamos"
                name="Préstamos Otorgados"
                fill="#0d6b63"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />

              {/* Barra 3: Interés Generado */}
              <Bar
                yAxisId="right"
                dataKey="interes"
                name="Interés Generado ($)"
                fill="#10b981"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

    </section>
  )
}