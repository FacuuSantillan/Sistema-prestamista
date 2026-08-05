import React, { useState, useEffect } from 'react'
import { Search, RefreshCw, UserCheck, UserX, UserPlus, CreditCard, Receipt } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

export default function RegistrosRecientes({ 
  onVerFichaPrestamo, 
  onAbrirCliente, 
  onAbrirInversionista,
  itemInicialId = null
}) {
  const [registros, setRegistros] = useState([])
  const [loading, setLoading] = useState(true)

  // Estados de los Filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroPersona, setFiltroPersona] = useState('todas')
  const [ordenamiento, setOrdenamiento] = useState('recientes')

  const [personasOptions, setPersonasOptions] = useState([])

  const cargarMovimientos = async () => {
    setLoading(true)
    try {
      // 1. Inversionistas / Usuarios
      const { data: inversionistas } = await supabase
        .from('usuarios')
        .select('*')

      // 2. Clientes
      const { data: clientes } = await supabase
        .from('clientes')
        .select('*, provincias(nombre)')

      // 3. Préstamos
      const { data: prestamos } = await supabase
        .from('prestamos')
        .select('*, clientes(nombre_completo)')

      // 4. Pagos / Cobros
      const { data: pagos } = await supabase
        .from('pagos')
        .select('*, clientes(nombre_completo)')

      const setPersonas = new Set()
      ;(inversionistas || []).forEach((inv) => {
        const nombre = inv.nombre_completo || inv.nombre
        if (nombre) setPersonas.add(nombre.trim())
      })
      ;(clientes || []).forEach((c) => {
        if (c.nombre_completo) setPersonas.add(c.nombre_completo.trim())
      })
      setPersonasOptions(Array.from(setPersonas).sort())

      // --- UNIFICACIÓN Y CLASIFICACIÓN DE EVENTOS ---
      const listadoInversionistas = []
      ;(inversionistas || []).forEach((inv) => {
        const nombre = inv.nombre_completo || inv.nombre || 'Inversionista sin nombre'
        const fechaCreacion = inv.creado_en || inv.created_at || new Date().toISOString()
        const fechaActualizado = inv.actualizado_en || inv.updated_at

        // 🟢 CARTA 1: CREADO
        listadoInversionistas.push({
          id: `inv-creado-${inv.id}`,
          tipo: 'INVERSIONISTA',
          accion: 'CREADO',
          subtitulo: 'Nuevo inversionista registrado',
          titulo: nombre,
          persona: nombre,
          detalles: [
            inv.telefono ? `Tel: ${inv.telefono}` : null,
            inv.email ? `Email: ${inv.email}` : null
          ].filter(Boolean).join(' · ') || 'Registrado en el sistema',
          estado: 'NUEVO REGISTRO',
          fechaRaw: fechaCreacion,
          rawItem: inv
        })

        // CARTA 2: HABILITADO / DESHABILITADO (Solo si hubo un cambio posterior)
        if (fechaActualizado && new Date(fechaActualizado) > new Date(fechaCreacion)) {
          const estaActivo = inv.activo !== false
          listadoInversionistas.push({
            id: `inv-estado-${inv.id}-${fechaActualizado}`,
            tipo: 'INVERSIONISTA',
            accion: estaActivo ? 'HABILITADO' : 'DESHABILITADO',
            subtitulo: estaActivo ? 'Perfil de inversionista reactivado' : 'Perfil de inversionista deshabilitado',
            titulo: nombre,
            persona: nombre,
            detalles: estaActivo ? 'Acceso y bolsa de capital habilitados' : 'Suspendido temporalmente',
            estado: estaActivo ? 'HABILITADO' : 'DESHABILITADO',
            fechaRaw: fechaActualizado,
            rawItem: inv
          })
        }
      })

      const listadoClientes = []
      ;(clientes || []).forEach((c) => {
        const nombre = c.nombre_completo || 'Cliente sin nombre'
        const fechaCreacion = c.creado_en || c.created_at || new Date().toISOString()
        const fechaActualizado = c.actualizado_en || c.updated_at

        // 🟢 CARTA 1: CREADO
        listadoClientes.push({
          id: `cli-creado-${c.id}`,
          tipo: 'CLIENTE',
          accion: 'CREADO',
          subtitulo: 'Nuevo cliente registrado',
          titulo: nombre,
          persona: nombre,
          detalles: [
            c.provincias?.nombre || null,
            c.telefono ? `Tel: ${c.telefono}` : null
          ].filter(Boolean).join(' · ') || 'Alta de cliente en sistema',
          estado: 'NUEVO REGISTRO',
          fechaRaw: fechaCreacion,
          rawItem: c
        })

        // CARTA 2: HABILITADO / DESHABILITADO
        if (fechaActualizado && new Date(fechaActualizado) > new Date(fechaCreacion)) {
          const estaActivo = c.activo !== false
          listadoClientes.push({
            id: `cli-estado-${c.id}-${fechaActualizado}`,
            tipo: 'CLIENTE',
            accion: estaActivo ? 'HABILITADO' : 'DESHABILITADO',
            subtitulo: estaActivo ? 'Perfil de cliente reactivado' : 'Perfil de cliente deshabilitado',
            titulo: nombre,
            persona: nombre,
            detalles: estaActivo ? 'Habilitado para solicitar préstamos' : 'Suspendido temporalmente',
            estado: estaActivo ? 'HABILITADO' : 'DESHABILITADO',
            fechaRaw: fechaActualizado,
            rawItem: c
          })
        }
      })

      // PRÉSTAMOS
      const listadoPrestamos = (prestamos || []).map((p) => {
        const nombreCliente = p.clientes?.nombre_completo || 'Cliente'
        return {
          id: `p-${p.id}`,
          tipo: 'PRÉSTAMO',
          accion: 'PRÉSTAMO',
          subtitulo: `Otorgado a ${nombreCliente}`,
          titulo: `Préstamo $${Number(p.monto_capital || 0).toLocaleString('es-AR')}`,
          persona: nombreCliente,
          detalles: `${p.cantidad_cuotas || 1} cuotas ${p.frecuencia || 'mensual'} · Total: $${Number(p.monto_total_pagar || 0).toLocaleString('es-AR')}`,
          estado: p.estado === 'finalizado' ? 'Finalizado' : 'Activo',
          fechaRaw: p.created_at || p.fecha_inicio || new Date().toISOString(),
          rawItem: p
        }
      })

      // COBROS
      const listadoPagos = (pagos || []).map((cobro) => {
        const nombreCliente = cobro.clientes?.nombre_completo || 'Cliente'
        return {
          id: `pago-${cobro.id}`,
          tipo: 'COBRO',
          accion: 'COBRO',
          subtitulo: `Cobro de ${nombreCliente}`,
          titulo: `Ingreso $${Number(cobro.monto_cobrado || cobro.monto_pago || 0).toLocaleString('es-AR')}`,
          persona: nombreCliente,
          detalles: `Método: ${cobro.metodo_pago || 'efectivo'}${cobro.observaciones ? ` · ${cobro.observaciones}` : ''}`,
          estado: 'Registrado',
          fechaRaw: cobro.created_at || cobro.fecha_pago || new Date().toISOString(),
          rawItem: cobro
        }
      })

      const todos = [
        ...listadoInversionistas,
        ...listadoClientes,
        ...listadoPrestamos,
        ...listadoPagos
      ]

      setRegistros(todos)
    } catch (err) {
      console.error('Error al unificar registros recientes:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarMovimientos()

    const canalFeed = supabase
      .channel('schema-feed-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'usuarios' }, () => cargarMovimientos())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes' }, () => cargarMovimientos())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prestamos' }, () => cargarMovimientos())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pagos' }, () => cargarMovimientos())
      .subscribe()

    return () => {
      supabase.removeChannel(canalFeed)
    }
  }, [])

  // Lógica de Filtrado
  const registrosFiltrados = registros
    .filter((reg) => {
      if (busqueda.trim() !== '') {
        const query = busqueda.toLowerCase()
        const coincideTitulo = reg.titulo.toLowerCase().includes(query)
        const coincideSubtitulo = reg.subtitulo.toLowerCase().includes(query)
        const coincideDetalles = reg.detalles.toLowerCase().includes(query)
        const coincidePersona = reg.persona?.toLowerCase().includes(query)

        if (!coincideTitulo && !coincideSubtitulo && !coincideDetalles && !coincidePersona) {
          return false
        }
      }

      if (filtroTipo !== 'todos' && reg.tipo.toLowerCase() !== filtroTipo.toLowerCase()) {
        return false
      }

      if (filtroEstado !== 'todos' && reg.estado.toLowerCase() !== filtroEstado.toLowerCase()) {
        return false
      }

      if (filtroPersona !== 'todas' && reg.persona !== filtroPersona) {
        return false
      }

      return true
    })
    .sort((a, b) => {
      const fechaA = new Date(a.fechaRaw)
      const fechaB = new Date(b.fechaRaw)
      return ordenamiento === 'recientes' ? fechaB - fechaA : fechaA - fechaB
    })

  const formatearFechaRelativa = (fechaStr) => {
    if (!fechaStr) return ''
    const fecha = new Date(fechaStr)
    const dia = String(fecha.getDate()).padStart(2, '0')
    const mes = String(fecha.getMonth() + 1).padStart(2, '0')
    const año = fecha.getFullYear()
    const horas = String(fecha.getHours()).padStart(2, '0')
    const minutos = String(fecha.getMinutes()).padStart(2, '0')
    return `${dia}/${mes}/${año} ${horas}:${minutos}`
  }

  // Manejador del clic
  const handleItemClick = (reg) => {
    if (reg.tipo === 'CLIENTE' && onAbrirCliente) {
      onAbrirCliente(reg.rawItem)
    } else if (reg.tipo === 'INVERSIONISTA' && onAbrirInversionista) {
      onAbrirInversionista(reg.rawItem)
    } else if (reg.tipo === 'PRÉSTAMO' && onVerFichaPrestamo) {
      onVerFichaPrestamo(reg.rawItem)
    }
  }

  return (
    <section className="w-[95%] mx-auto space-y-4 my-8">
      
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1d2939]">
          Registros recientes
        </h2>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-line shadow-xs">
            {registrosFiltrados.length} {registrosFiltrados.length === 1 ? 'registro' : 'registros'}
          </span>
          <button
            onClick={cargarMovimientos}
            disabled={loading}
            title="Actualizar registros"
            className="p-2 rounded-xl bg-white border border-line text-slate-600 hover:text-[#0d6b63] hover:border-[#0d6b63] transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* BARRA DE FILTROS */}
      <div className="p-4 rounded-3xl bg-white border border-line shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar clientes, préstamos o cobradores..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-2xl border border-line bg-cream/40 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0d6b63]/20 focus:border-[#0d6b63]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="w-full rounded-2xl border border-line bg-cream/30 px-4 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0d6b63]/20 focus:border-[#0d6b63] cursor-pointer"
          >
            <option value="todos">Todos los tipos</option>
            <option value="inversionista">Inversionistas</option>
            <option value="cliente">Clientes</option>
            <option value="préstamo">Préstamos</option>
            <option value="cobro">Cobros</option>
          </select>

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="w-full rounded-2xl border border-line bg-cream/30 px-4 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0d6b63]/20 focus:border-[#0d6b63] cursor-pointer"
          >
            <option value="todos">Todos los estados</option>
            <option value="nuevo registro">Nuevo registro</option>
            <option value="habilitado">Habilitado</option>
            <option value="deshabilitado">Deshabilitado</option>
            <option value="activo">Activo</option>
            <option value="finalizado">Finalizado</option>
          </select>

          <select
            value={filtroPersona}
            onChange={(e) => setFiltroPersona(e.target.value)}
            className="w-full rounded-2xl border border-line bg-cream/30 px-4 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0d6b63]/20 focus:border-[#0d6b63] cursor-pointer"
          >
            <option value="todas">Todas las personas</option>
            {personasOptions.map((persona, i) => (
              <option key={i} value={persona}>
                {persona}
              </option>
            ))}
          </select>

          <select
            value={ordenamiento}
            onChange={(e) => setOrdenamiento(e.target.value)}
            className="w-full rounded-2xl border border-line bg-cream/30 px-4 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0d6b63]/20 focus:border-[#0d6b63] cursor-pointer"
          >
            <option value="recientes">Más recientes</option>
            <option value="antiguos">Más antiguos</option>
          </select>
        </div>
      </div>

      {/* GRILLA DE TARJETAS */}
      {loading ? (
        <div className="p-8 text-center bg-white rounded-3xl border border-line text-xs font-medium text-slate-400">
          Cargando historial de movimientos...
        </div>
      ) : registrosFiltrados.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-3xl border border-line text-xs font-medium text-slate-400">
          No se encontraron registros coincidentes con los filtros aplicados.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {registrosFiltrados.map((reg) => {
            const esClickeable = ['CLIENTE', 'INVERSIONISTA', 'PRÉSTAMO'].includes(reg.tipo)

            // 🔴 CONFIGURACIÓN DE ESTILOS POR ACCIÓN
            let cardEstilo = 'bg-white border-line hover:border-[#0d6b63]/40'
            let badgeEstilo = 'bg-slate-100 text-slate-700'
            let IconoAccion = UserPlus

            if (reg.accion === 'CREADO') {
              // 🟢 CARTA CREACIÓN (Verde Teal suave)
              cardEstilo = 'bg-white border-[#0d6b63]/30 hover:border-[#0d6b63] shadow-xs'
              badgeEstilo = 'bg-[#0d6b63]/10 text-[#0d6b63] border border-[#0d6b63]/20 font-bold'
              IconoAccion = UserPlus
            } else if (reg.accion === 'HABILITADO') {
              // 🟡 CARTA HABILITADO (Verde Esmeralda)
              cardEstilo = 'bg-emerald-50/40 border-emerald-300/80 hover:border-emerald-400 shadow-xs'
              badgeEstilo = 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold'
              IconoAccion = UserCheck
            } else if (reg.accion === 'DESHABILITADO') {
              // 🔴 CARTA DESHABILITADO (Rojo/Rosado)
              cardEstilo = 'bg-rose-50/50 border-rose-300/80 hover:border-rose-400 shadow-xs'
              badgeEstilo = 'bg-rose-100 text-rose-800 border border-rose-300 font-bold'
              IconoAccion = UserX
            } else if (reg.tipo === 'COBRO') {
              badgeEstilo = 'bg-blue-100 text-blue-800'
              IconoAccion = Receipt
            } else if (reg.tipo === 'PRÉSTAMO') {
              badgeEstilo = reg.estado === 'Finalizado' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
              IconoAccion = CreditCard
            }

            return (
              <div
                key={reg.id}
                onClick={() => handleItemClick(reg)}
                className={`p-5 rounded-3xl border shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative ${cardEstilo} ${
                  esClickeable ? 'cursor-pointer' : ''
                }`}
              >
                <div>
                  {/* Encabezado */}
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#0d6b63]">
                      {reg.tipo}
                    </span>

                    <span className={`text-[10px] uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 ${badgeEstilo}`}>
                      <IconoAccion className="w-3 h-3" />
                      <span>{reg.estado}</span>
                    </span>
                  </div>

                  {/* Nombre o Título */}
                  <h3 className="text-lg font-bold text-slate-900 leading-snug">
                    {reg.titulo}
                  </h3>

                  {/* Subtítulo descriptivo */}
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {reg.subtitulo}
                  </p>
                </div>

                {/* Pie de Tarjeta con detalles y fecha/hora exacta */}
                <div className="pt-4 mt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                  <span className="truncate pr-2 font-medium text-slate-600">{reg.detalles}</span>
                  <span className="shrink-0 font-semibold text-slate-500">
                    {formatearFechaRelativa(reg.fechaRaw)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

    </section>
  )
}