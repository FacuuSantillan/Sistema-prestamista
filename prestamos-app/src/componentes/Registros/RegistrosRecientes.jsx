import React, { useState, useEffect } from 'react'
import { 
  Search, 
  RefreshCw, 
  UserCheck, 
  UserX, 
  UserPlus, 
  CreditCard, 
  Receipt,
  ShieldAlert,
  Shield,
  Briefcase,
  Clock
} from 'lucide-react'
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
  const [filtroRolAutor, setFiltroRolAutor] = useState('todos')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroPersona, setFiltroPersona] = useState('todas')
  const [ordenamiento, setOrdenamiento] = useState('recientes')

  const [personasOptions, setPersonasOptions] = useState([])

 const cargarMovimientos = async () => {
    setLoading(true)
    try {
      // 1. Cargar todos los perfiles de usuarios (Owners, Admins e Inversores)
      const { data: usuarios } = await supabase
        .from('usuarios')
        .select('*')

      // 2. Cargar Clientes
      const { data: clientes } = await supabase
        .from('clientes')
        .select('*, provincias(nombre)')

      // 3. Cargar Préstamos
      const { data: prestamos } = await supabase
        .from('prestamos')
        .select('*, clientes(nombre_completo)')

      // 4. Cargar Pagos
      const { data: pagos } = await supabase
        .from('pagos')
        .select('*, clientes(nombre_completo)')

      const listaUsuarios = usuarios || []
      const listaClientes = clientes || []
      const listaPrestamos = prestamos || []
      const listaPagos = pagos || []

      // 💡 MAPA DE USUARIOS: Clave ID -> Objeto Usuario
      const mapaUsuarios = {}
      listaUsuarios.forEach((u) => {
        mapaUsuarios[u.id] = u
      })

      // Opciones para el filtro de personas
      const setPersonas = new Set()
      listaUsuarios.forEach((u) => {
        if (u.nombre_completo) setPersonas.add(u.nombre_completo.trim())
      })
      listaClientes.forEach((c) => {
        if (c.nombre_completo) setPersonas.add(c.nombre_completo.trim())
      })
      setPersonasOptions(Array.from(setPersonas).sort())

      // --- 1. USUARIOS / INVERSORES / ADMINS ---
      const listadoUsuarios = listaUsuarios.map((u) => {
        const nombre = u.nombre_completo || 'Usuario sin nombre'
        const fechaCreacion = u.created_at || u.creado_en || new Date().toISOString()
        const rol = u.rol || 'inversionista'

        return {
          id: `usr-${u.id}`,
          tipo: rol.toUpperCase(),
          accion: 'CREADO',
          subtitulo: 'Alta de perfil en plataforma',
          titulo: nombre,
          persona: nombre,
          autorNombre: 'Sistema / Owner',
          autorRol: 'owner',
          detalles: [
            u.telefono ? `Tel: ${u.telefono}` : null,
            u.email ? `Email: ${u.email}` : null,
            Number(u.capital_disponible) > 0 ? `Capital: $${Number(u.capital_disponible).toLocaleString('es-AR')}` : null
          ].filter(Boolean).join(' · ') || 'Registrado en el sistema',
          estado: 'NUEVO REGISTRO',
          fechaRaw: fechaCreacion,
          rawItem: u
        }
      })

      // --- 2. CLIENTES ---
      const listadoClientes = listaClientes.map((c) => {
        const nombre = c.nombre_completo || 'Cliente sin nombre'
        const fechaCreacion = c.created_at || c.creado_en || new Date().toISOString()
        
        // Quien creó el cliente (creado_por)
        const creador = c.creado_por ? mapaUsuarios[c.creado_por] : null
        const autorNombre = creador?.nombre_completo || 'Sistema / Owner'
        const autorRol = creador?.rol || 'owner'

        // Inversor de la cartera asignada
        const inversorCartera = c.inversionista_id ? mapaUsuarios[c.inversionista_id] : null
        const nombreCartera = inversorCartera?.nombre_completo

        return {
          id: `cli-${c.id}`,
          tipo: 'CLIENTE',
          accion: 'CREADO',
          subtitulo: nombreCartera 
            ? `Asignado a cartera de: ${nombreCartera}` 
            : 'Nuevo cliente registrado',
          titulo: nombre,
          persona: nombre,
          autorNombre: autorNombre,
          autorRol: autorRol,
          detalles: [
            c.provincias?.nombre ? `Prov: ${c.provincias.nombre}` : null,
            c.telefono ? `Tel: ${c.telefono}` : null,
            c.dni_cuit ? `DNI/CUIT: ${c.dni_cuit}` : null
          ].filter(Boolean).join(' · ') || 'Alta de cliente en sistema',
          estado: c.activo !== false ? 'Activo' : 'Inactivo',
          fechaRaw: fechaCreacion,
          rawItem: c
        }
      })

      // --- 3. PRÉSTAMOS ---
      const listadoPrestamos = listaPrestamos.map((p) => {
        const nombreCliente = p.clientes?.nombre_completo || 'Cliente'
        
        // Autor real que ejecutó el préstamo (creado_por)
        const creador = p.creado_por ? mapaUsuarios[p.creado_por] : null
        const autorNombre = creador?.nombre_completo || 'Administración'
        const autorRol = creador?.rol || 'admin'

        // Fondo del inversionista utilizado
        const inversorFondo = p.inversionista_id ? mapaUsuarios[p.inversionista_id] : null
        const nombreInversor = inversorFondo?.nombre_completo || null

        return {
          id: `p-${p.id}`,
          tipo: 'PRÉSTAMO',
          accion: 'PRÉSTAMO',
          subtitulo: nombreInversor 
            ? `Otorgado a ${nombreCliente} · Fondo: ${nombreInversor}` 
            : `Otorgado a ${nombreCliente}`,
          titulo: `Préstamo $${Number(p.monto_capital || 0).toLocaleString('es-AR')}`,
          persona: nombreCliente,
          autorNombre: autorNombre,
          autorRol: autorRol,
          detalles: `${p.cantidad_cuotas || 1} cuotas ${p.frecuencia || 'mensual'} · Total: $${Number(p.monto_total_pagar || 0).toLocaleString('es-AR')}`,
          estado: p.estado === 'finalizado' ? 'Finalizado' : 'Activo',
          fechaRaw: p.created_at || p.fecha_inicio || new Date().toISOString(),
          rawItem: p
        }
      })

      // --- 4. COBROS / PAGOS ---
      const listadoPagos = listaPagos.map((cobro) => {
        const nombreCliente = cobro.clientes?.nombre_completo || 'Cliente'
        
        // 💡 AQUÍ ESTÁ LA CLAVE: Buscar quién ejecutó la acción con 'creado_por'
        const creador = cobro.creado_por ? mapaUsuarios[cobro.creado_por] : null
        
        // Si tiene creador registrado usa sus datos, si no, busca el inversionista
        const autorNombre = creador?.nombre_completo || (cobro.inversionista_id ? mapaUsuarios[cobro.inversionista_id]?.nombre_completo : 'Administrador')
        const autorRol = creador?.rol || 'admin'

        const inversorCartera = cobro.inversionista_id ? mapaUsuarios[cobro.inversionista_id] : null
        const nombreCartera = inversorCartera?.nombre_completo

        return {
          id: `pago-${cobro.id}`,
          tipo: 'COBRO',
          accion: 'COBRO',
          subtitulo: nombreCartera ? `Cobro a ${nombreCliente} (${nombreCartera})` : `Cobro a ${nombreCliente}`,
          titulo: `Ingreso $${Number(cobro.monto_cobrado || 0).toLocaleString('es-AR')}`,
          persona: nombreCliente,
          autorNombre: autorNombre,
          autorRol: autorRol,
          detalles: `Método: ${cobro.metodo_pago || 'efectivo'}${cobro.observaciones ? ` · ${cobro.observaciones}` : ''}`,
          estado: 'Registrado',
          fechaRaw: cobro.created_at || cobro.fecha_pago || new Date().toISOString(),
          rawItem: cobro
        }
      })

      const todos = [
        ...listadoUsuarios,
        ...listadoClientes,
        ...listadoPrestamos,
        ...listadoPagos
      ]

      setRegistros(todos)
    } catch (err) {
      console.error('Error al unificar auditoría de registros:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarMovimientos()

    const canalFeed = supabase
      .channel('audit-feed-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'usuarios' }, () => cargarMovimientos())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes' }, () => cargarMovimientos())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prestamos' }, () => cargarMovimientos())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pagos' }, () => cargarMovimientos())
      .subscribe()

    return () => {
      supabase.removeChannel(canalFeed)
    }
  }, [])

  // Filtrado y búsqueda
  const registrosFiltrados = registros
    .filter((reg) => {
      if (busqueda.trim() !== '') {
        const query = busqueda.toLowerCase()
        const coincideTitulo = reg.titulo.toLowerCase().includes(query)
        const coincideSubtitulo = reg.subtitulo.toLowerCase().includes(query)
        const coincideDetalles = reg.detalles.toLowerCase().includes(query)
        const coincidePersona = reg.persona?.toLowerCase().includes(query)
        const coincideAutor = reg.autorNombre?.toLowerCase().includes(query)

        if (!coincideTitulo && !coincideSubtitulo && !coincideDetalles && !coincidePersona && !coincideAutor) {
          return false
        }
      }

      if (filtroTipo !== 'todos' && reg.tipo.toLowerCase() !== filtroTipo.toLowerCase()) {
        return false
      }

      if (filtroRolAutor !== 'todos' && reg.autorRol.toLowerCase() !== filtroRolAutor.toLowerCase()) {
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

  // Formato exacto: DD/MM/AAAA - HH:MM:SS hs
  const formatearFechaHoraExacta = (fechaStr) => {
    if (!fechaStr) return 'Fecha sin registrar'
    const fecha = new Date(fechaStr)
    const dia = String(fecha.getDate()).padStart(2, '0')
    const mes = String(fecha.getMonth() + 1).padStart(2, '0')
    const anio = fecha.getFullYear()
    const horas = String(fecha.getHours()).padStart(2, '0')
    const minutos = String(fecha.getMinutes()).padStart(2, '0')
    const segundos = String(fecha.getSeconds()).padStart(2, '0')
    return `${dia}/${mes}/${anio} · ${horas}:${minutos}:${segundos} hs`
  }

  const handleItemClick = (reg) => {
    if (reg.tipo === 'CLIENTE' && onAbrirCliente) {
      onAbrirCliente(reg.rawItem)
    } else if (['INVERSIONISTA', 'ADMIN', 'OWNER'].includes(reg.tipo) && onAbrirInversionista) {
      onAbrirInversionista(reg.rawItem)
    } else if (reg.tipo === 'PRÉSTAMO' && onVerFichaPrestamo) {
      onVerFichaPrestamo(reg.rawItem)
    }
  }

  return (
    <section className="w-[95%] mx-auto space-y-4 my-8 select-none">
      
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold tracking-widest uppercase text-[#0d6b63]">
            AUDITORÍA Y TRAZABILIDAD
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1d2939] mt-0.5">
            Registro de actividades
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-500 bg-white px-3.5 py-2 rounded-2xl border border-line shadow-xs">
            {registrosFiltrados.length} {registrosFiltrados.length === 1 ? 'actividad' : 'actividades'}
          </span>
          <button
            onClick={cargarMovimientos}
            disabled={loading}
            title="Actualizar auditoría"
            className="p-2.5 rounded-2xl bg-white border border-line text-slate-600 hover:text-[#0d6b63] hover:border-[#0d6b63] transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0d6b63]' : ''}`} />
          </button>
        </div>
      </div>

      {/* BARRA DE FILTROS */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white border border-line shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por cliente, monto, detalle o responsable que lo ejecutó..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-2xl border border-line bg-cream/40 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0d6b63]/20 focus:border-[#0d6b63]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* Tipo de Registro */}
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="w-full rounded-2xl border border-line bg-cream/30 px-3.5 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0d6b63]/20 cursor-pointer shadow-xs"
          >
            <option value="todos">Todos los módulos</option>
            <option value="préstamo">Préstamos</option>
            <option value="cobro">Cobros</option>
            <option value="cliente">Clientes</option>
            <option value="inversionista">Inversionistas</option>
            <option value="admin">Administradores</option>
          </select>

          {/* Quién lo realizó (Rol del autor) */}
          <select
            value={filtroRolAutor}
            onChange={(e) => setFiltroRolAutor(e.target.value)}
            className="w-full rounded-2xl border border-line bg-cream/30 px-3.5 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0d6b63]/20 cursor-pointer shadow-xs"
          >
            <option value="todos">Cualquier Responsable</option>
            <option value="owner">Ejecutado por: Owner</option>
            <option value="admin">Ejecutado por: Admin</option>
            <option value="inversionista">Ejecutado por: Inversor</option>
          </select>

          {/* Estado */}
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="w-full rounded-2xl border border-line bg-cream/30 px-3.5 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0d6b63]/20 cursor-pointer shadow-xs"
          >
            <option value="todos">Todos los estados</option>
            <option value="nuevo registro">Nuevo registro</option>
            <option value="activo">Activo</option>
            <option value="registrado">Registrado</option>
            <option value="finalizado">Finalizado</option>
          </select>

          {/* Persona involucrada */}
          <select
            value={filtroPersona}
            onChange={(e) => setFiltroPersona(e.target.value)}
            className="w-full rounded-2xl border border-line bg-cream/30 px-3.5 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0d6b63]/20 cursor-pointer shadow-xs"
          >
            <option value="todas">Todas las personas</option>
            {personasOptions.map((persona, i) => (
              <option key={i} value={persona}>
                {persona}
              </option>
            ))}
          </select>

          {/* Orden cronológico */}
          <select
            value={ordenamiento}
            onChange={(e) => setOrdenamiento(e.target.value)}
            className="w-full rounded-2xl border border-line bg-cream/30 px-3.5 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0d6b63]/20 cursor-pointer shadow-xs"
          >
            <option value="recientes">Más recientes primero</option>
            <option value="antiguos">Más antiguos primero</option>
          </select>
        </div>
      </div>

      {/* GRILLA DE TARJETAS AUDITABLES */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-line text-xs font-medium text-slate-400">
          Cargando libro de auditoría...
        </div>
      ) : registrosFiltrados.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-line text-xs font-medium text-slate-400">
          No se encontraron registros con los filtros seleccionados.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {registrosFiltrados.map((reg) => {
            const esClickeable = ['CLIENTE', 'INVERSIONISTA', 'PRÉSTAMO', 'ADMIN'].includes(reg.tipo)

            // Badge y color del Tipo de Operación
            let badgeTipoColor = 'bg-slate-100 text-slate-700'
            let IconoOperacion = UserPlus

            if (reg.tipo === 'PRÉSTAMO') {
              badgeTipoColor = 'bg-[#0d6b63]/10 text-[#0d6b63] border border-[#0d6b63]/20'
              IconoOperacion = CreditCard
            } else if (reg.tipo === 'COBRO') {
              badgeTipoColor = 'bg-blue-100 text-blue-800 border border-blue-200'
              IconoOperacion = Receipt
            } else if (reg.tipo === 'INVERSIONISTA') {
              badgeTipoColor = 'bg-purple-100 text-purple-800 border border-purple-200'
              IconoOperacion = Briefcase
            } else if (reg.tipo === 'CLIENTE') {
              badgeTipoColor = 'bg-amber-100 text-amber-800 border border-amber-200'
              IconoOperacion = UserCheck
            }

            // Badge del Rol Responsable
            let badgeRolColor = 'bg-slate-100 text-slate-600'
            let IconoRol = Shield

            if (reg.autorRol === 'owner') {
              badgeRolColor = 'bg-rose-100 text-rose-800 font-bold border border-rose-200'
              IconoRol = ShieldAlert
            } else if (reg.autorRol === 'admin') {
              badgeRolColor = 'bg-blue-100 text-blue-800 font-bold border border-blue-200'
              IconoRol = Shield
            } else if (reg.autorRol === 'inversionista') {
              badgeRolColor = 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-200'
              IconoRol = Briefcase
            }

            return (
              <div
                key={reg.id}
                onClick={() => handleItemClick(reg)}
                className={`p-5 rounded-3xl bg-white border border-line shadow-xs hover:shadow-md hover:border-[#0d6b63]/40 transition-all flex flex-col justify-between ${
                  esClickeable ? 'cursor-pointer' : ''
                }`}
              >
                <div>
                  {/* Encabezado: Tipo de evento y Estado */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-xl flex items-center gap-1.5 ${badgeTipoColor}`}>
                      <IconoOperacion className="w-3.5 h-3.5" />
                      <span>{reg.tipo}</span>
                    </span>

                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-50 text-slate-500 border border-slate-200/60">
                      {reg.estado}
                    </span>
                  </div>

                  {/* Título Principal y Subtítulo */}
                  <h3 className="text-lg font-bold text-slate-900 leading-snug">
                    {reg.titulo}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {reg.subtitulo}
                  </p>

                  {/* Detalle secundario */}
                  <p className="text-[11px] font-semibold text-slate-600 mt-2 line-clamp-2">
                    {reg.detalles}
                  </p>
                </div>

                {/* Bloque Inferior: Autor y Timestamp Exacto */}
                <div className="pt-3.5 mt-3.5 border-t border-slate-100 space-y-2">
                  
                  {/* Responsable de la acción */}
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-medium">Ejecutado por:</span>
                    <span className={`text-[10px] uppercase px-2 py-0.5 rounded-lg flex items-center gap-1 ${badgeRolColor}`}>
                      <IconoRol className="w-3 h-3" />
                      <span>{reg.autorRol}: {reg.autorNombre}</span>
                    </span>
                  </div>

                  {/* Fecha y Hora Exacta */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock className="w-3 h-3" /> Fecha y Hora:
                    </span>
                    <span className="font-semibold text-slate-700">
                      {formatearFechaHoraExacta(reg.fechaRaw)}
                    </span>
                  </div>

                </div>
              </div>
            )
          })}
        </div>
      )}

    </section>
  )
}