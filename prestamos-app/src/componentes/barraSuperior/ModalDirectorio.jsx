import React, { useState, useEffect } from 'react'
import { 
  X, 
  Search, 
  User, 
  Briefcase, 
  Receipt, 
  CreditCard, 
  ChevronRight, 
  Power, 
  Eye, 
  DollarSign, 
  TrendingUp, 
  Wallet,
  Users,
  ChevronDown
} from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

export default function ModalDirectorio({ 
  isOpen, 
  onClose, 
  tipoInicial = 'clientes', 
  itemInicialId = null, 
  onVerFichaPrestamo 
}) {
  const [tipo, setTipo] = useState(tipoInicial) // 'clientes' o 'inversionistas'
  const [busqueda, setBusqueda] = useState('')
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(false)

  // Selección de Inversionista cuando tipo === 'inversionistas'
  const [listaInversionistas, setListaInversionistas] = useState([])
  const [inversionistaSeleccionado, setInversionistaSeleccionado] = useState(null)
  const [menuInversionistasAbierto, setMenuInversionistasAbierto] = useState(false)

  // Selección de Perfil / Cliente
  const [itemSeleccionado, setItemSeleccionado] = useState(null)
  const [referidoInfo, setReferidoInfo] = useState(null)
  const [prestamos, setPrestamos] = useState([])
  const [pagos, setPagos] = useState([])
  const [clientesRelacionados, setClientesRelacionados] = useState([])
  const [fetchingDetalle, setFetchingDetalle] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // Resetear estados al abrir/cerrar modal
  useEffect(() => {
    if (isOpen) {
      setTipo(tipoInicial)
      setBusqueda('')
      setItemSeleccionado(null)
      setInversionistaSeleccionado(null)
      setMenuInversionistasAbierto(false)
      setReferidoInfo(null)
      setLista([])
      setPrestamos([])
      setPagos([])
      setClientesRelacionados([])
    }
  }, [isOpen, tipoInicial])

  // Cargar lista según el tipo seleccionado
 useEffect(() => {
    if (!isOpen) return
    let isMounted = true

    async function fetchData() {
      setLoading(true)

      try {
        if (tipo === 'clientes') {
          // VISTA CLIENTES: Cargar lista general de clientes
          let query = supabase.from('clientes').select('*').order('nombre_completo', { ascending: true })

          if (busqueda.trim() !== '') {
            query = query.ilike('nombre_completo', `%${busqueda}%`)
          }

          const { data, error } = await query
          if (error) throw error

          if (isMounted) {
            const listaData = data || []
            setLista(listaData)

            if (listaData.length > 0) {
              // 🔴 Si ya teníamos un cliente seleccionado (o viene de itemInicialId), mantenemos a ese cliente
              const idABuscar = itemSeleccionado?.id || itemInicialId
              const itemEspecifico = idABuscar 
                ? listaData.find((el) => el.id === idABuscar) 
                : null

              const perfilASeleccionar = itemEspecifico || listaData[0]
              cargarDetallePerfil(perfilASeleccionar, 'clientes')
            } else {
              setItemSeleccionado(null)
            }
          }
        } else {
          // VISTA INVERSIONISTAS
          const { data: invs, error: errInv } = await supabase
            .from('usuarios')
            .select('*')
            .order('nombre_completo', { ascending: true })

          if (errInv) throw errInv

          if (isMounted) {
            const listaInvs = invs || []
            setListaInversionistas(listaInvs)

            if (listaInvs.length > 0) {
              const invInicial = itemInicialId ? listaInvs.find((el) => el.id === itemInicialId) : listaInvs[0]
              setInversionistaSeleccionado(invInicial || listaInvs[0])
            }
          }
        }
      } catch (err) {
        console.error(`Error al cargar datos del directorio (${tipo}):`, err)
        if (isMounted) setLista([])
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchData()

    return () => { isMounted = false }
  }, [tipo, busqueda, isOpen])

  // Cargar datos de los clientes asociados cuando cambia el inversionista seleccionado
  // Cargar préstamos y clientes del inversionista seleccionado de forma estricta
 // Cargar préstamos y clientes del inversionista seleccionado de forma estricta
  useEffect(() => {
    if (tipo !== 'inversionistas' || !inversionistaSeleccionado) return

    let isMounted = true

    async function cargarClientesDelInversionista() {
      setLoading(true)
      try {
        const invId = inversionistaSeleccionado.id

        // 1. Obtener Préstamos otorgados por ESTE inversionista específico (Capturando errP)
        const { data: prestamosData, error: errP } = await supabase
          .from('prestamos')
          .select('*')
          .eq('inversionista_id', invId)
          .order('fecha_inicio', { ascending: false })

        if (errP) console.warn('Aviso al cargar préstamos del inversionista:', errP.message)

        const prestamosFinales = prestamosData || []
        if (isMounted) setPrestamos(prestamosFinales)

        // 2. Extraer los IDs de clientes vinculados a través de préstamos
        const clienteIdsDePrestamos = [...new Set(prestamosFinales.map((p) => p.cliente_id))].filter(Boolean)

        // 3. Buscar clientes asignados DIRECTAMENTE o por PRÉSTAMOS
        let queryClientes = supabase
          .from('clientes')
          .select('*')

        if (clienteIdsDePrestamos.length > 0) {
          // Si hay préstamos, busca clientes vinculados por ID de préstamo O por la columna inversionista_id
          queryClientes = queryClientes.or(`inversionista_id.eq.${invId},id.in.(${clienteIdsDePrestamos.join(',')})`)
        } else {
          // Si no hay préstamos, busca solo por la columna inversionista_id del cliente
          queryClientes = queryClientes.eq('inversionista_id', invId)
        }

        queryClientes = queryClientes.order('nombre_completo', { ascending: true })

        // Filtro adicional de texto si el usuario usó el buscador
        if (busqueda.trim() !== '') {
          queryClientes = queryClientes.ilike('nombre_completo', `%${busqueda}%`)
        }

        const { data: clientesData, error: errC } = await queryClientes
        if (errC) throw errC

        if (isMounted) {
          const resultadoClientes = clientesData || []
          setClientesRelacionados(resultadoClientes)
          setLista(resultadoClientes)
        }
      } catch (err) {
        console.error('Error al cargar clientes del inversionista:', err)
        if (isMounted) {
          setClientesRelacionados([])
          setLista([])
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    cargarClientesDelInversionista()

    return () => { isMounted = false }
  }, [inversionistaSeleccionado, tipo, busqueda])

  // Cargar detalle individual de cliente o perfil
const cargarDetallePerfil = async (item, tipoActual) => {
  if (!item) return
  setItemSeleccionado(item)
  setFetchingDetalle(true)
  setReferidoInfo(null)
  setPrestamos([])
  setPagos([])

  try {
    if (tipoActual === 'clientes') {
      // 1. Cargar Préstamos del cliente
      const { data: prestamosData } = await supabase
        .from('prestamos')
        .select('*')
        .eq('cliente_id', item.id)
        .order('fecha_inicio', { ascending: false })

      const prestamosFinales = prestamosData || []
      setPrestamos(prestamosFinales)

      // 2. Cargar Pagos del cliente
    const { data: pagosData } = await supabase
  .from('pagos')
  .select('*, clientes(nombre_completo)')
  .eq('cliente_id', item.id) // O eq('inversionista_id', item.id) según el contexto
  .order('fecha_pago', { ascending: false })

setPagos(pagosData || [])

      // 3. Obtener el ID del inversionista (del cliente o de sus préstamos)
      let idInversionista = item.inversionista_id || item.usuario_id

      if (!idInversionista && prestamosFinales.length > 0) {
        const prestamoConInversionista = prestamosFinales.find((p) => p.inversionista_id)
        if (prestamoConInversionista) {
          idInversionista = prestamoConInversionista.inversionista_id
        }
      }

      // 4. Consultar el inversionista sin pedir 'nombre_completo' si la tabla solo usa 'nombre' o '*'
      if (idInversionista) {
        const { data: invData, error: errInv } = await supabase
          .from('usuarios')
          .select('*') // 👈 Pedimos '*' para evitar el error 400 por columnas inexistentes
          .eq('id', idInversionista)
          .maybeSingle()

        if (!errInv && invData) {
          const nombreMostrar = invData.nombre || invData.nombre_completo || invData.email
          setReferidoInfo(nombreMostrar ? `Inversionista (${nombreMostrar})` : 'Inversionista asignado')
        } else {
          setReferidoInfo('Propio (Administrador)')
        }
      } else {
        setReferidoInfo('Propio (Administrador)')
      }
    }
  } catch (err) {
    console.error('Error al cargar detalle del perfil:', err)
    setReferidoInfo('Propio (Administrador)')
  } finally {
    setFetchingDetalle(false)
  }
}

  // Navegar directamente al perfil de un cliente
  const handleIrAPerfilCliente = (cliente) => {
    setTipo('clientes')
    cargarDetallePerfil(cliente, 'clientes')
  }

  // Alternar estado Habilitar/Deshabilitar
  const handleToggleEstado = async (targetItem, tablaNombre) => {
    if (!targetItem) return
    setActionLoading(true)

    const nuevoEstado = !(targetItem.activo ?? true)

    try {
      const { data, error } = await supabase
        .from(tablaNombre)
        .update({ activo: nuevoEstado })
        .eq('id', targetItem.id)
        .select()

      if (error) throw error

      if (tablaNombre === 'usuarios') {
        setInversionistaSeleccionado((prev) => ({ ...prev, activo: nuevoEstado }))
        setListaInversionistas((prev) => prev.map((inv) => inv.id === targetItem.id ? { ...inv, activo: nuevoEstado } : inv))
      } else {
        const itemActualizado = { ...targetItem, activo: nuevoEstado }
        setItemSeleccionado(itemActualizado)
        setLista((prev) => prev.map((e) => (e.id === targetItem.id ? itemActualizado : e)))
      }
    } catch (err) {
      console.error('Error al cambiar estado:', err)
      alert(`Error al actualizar en la DB: ${err.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  // Cálculos financieros del inversionista seleccionado
  const totalCapitalInvertido = Number(inversionistaSeleccionado?.capital_disponible || 0)
  const totalRetornoEsperado = prestamos.reduce((acc, p) => acc + Number(p.monto_total_pagar || p.monto_total || 0), 0)
  const totalCapitalColocado = prestamos.reduce((acc, p) => acc + Number(p.monto_capital || p.monto || 0), 0)
  const totalInteresesGanados = Math.max(0, totalRetornoEsperado - totalCapitalColocado)

  const formatearFecha = (fechaRaw) => {
    if (!fechaRaw) return ''
    const fecha = fechaRaw.split('T')[0]
    const [year, month, day] = fecha.split('-')
    return `${day}/${month}/${year}`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="w-full max-w-5xl rounded-3xl bg-cream p-6 sm:p-8 shadow-2xl border border-line h-[88vh] flex flex-col overflow-hidden">
        
        {/* CABECERA */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-line shrink-0">
          <div>
            <span className="text-[11px] font-bold tracking-widest uppercase text-[#0d6b63]">
              DIRECTORIO DE BÚSQUEDA
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1d2939]">
              {tipo === 'clientes' ? 'Perfil' : 'Perfil'}
            </h2>
          </div>

          <div className="flex items-center gap-2 bg-white/80 p-1.5 rounded-2xl border border-line">
            <button
              onClick={() => setTipo('clientes')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                tipo === 'clientes' ? 'bg-[#0d6b63] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Clientes</span>
            </button>

            <button
              onClick={() => setTipo('inversionistas')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                tipo === 'inversionistas' ? 'bg-[#0d6b63] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Inversionistas</span>
            </button>

            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CUERPO PRINCIPAL */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4 flex-1 overflow-hidden">
          
          {/* COLUMNA IZQUIERDA: Clientes o Clientes del Inversionista */}
          <div className="md:col-span-4 flex flex-col h-full border-r border-line/60 pr-0 md:pr-4 overflow-hidden">
            
            {/* Buscador general de la columna izquierda */}
            <div className="relative mb-3 shrink-0">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={tipo === 'clientes' ? "Buscar clientes..." : "Buscar cliente financiado..."}
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white rounded-2xl border border-line text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0d6b63]/20 focus:border-[#0d6b63]"
              />
            </div>

            {/* Subtítulo informativo del panel izquierdo */}
            {tipo === 'inversionistas' && (
              <div className="mb-2 px-1 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  CLIENTES FINANCIADOS ({lista.length})
                </span>
              </div>
            )}

            {/* LISTA LATERAL DE CLIENTES */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {loading ? (
                <p className="text-xs text-slate-400 text-center py-6">Cargando lista...</p>
              ) : lista.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  {tipo === 'clientes' ? 'No hay clientes registrados.' : 'Sin clientes asignados a este inversor.'}
                </p>
              ) : (
                lista.map((item) => {
                  const estaActivo = item.activo ?? true
                  const esSeleccionado = tipo === 'clientes' ? itemSeleccionado?.id === item.id : false

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleIrAPerfilCliente(item)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        esSeleccionado
                          ? 'bg-[#0d6b63] text-white border-[#0d6b63] shadow-sm'
                          : 'bg-white border-line text-slate-800 hover:border-[#0d6b63]/40'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm leading-tight">
                            {item.nombre_completo || item.nombre || 'Sin nombre'}
                          </h4>
                          {!estaActivo && (
                            <span className="text-[9px] font-bold uppercase bg-red-100 text-red-700 px-1.5 py-0.5 rounded-md">
                              Inactivo
                            </span>
                          )}
                        </div>
                        <span className={`text-[11px] ${esSeleccionado ? 'text-white/80' : 'text-slate-500'}`}>
                          Tel: {item.telefono || 'Sin teléfono'}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 opacity-70" />
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* COLUMNA DERECHA: Ficha Técnica o Perfil de Inversionista */}
          <div className="md:col-span-8 flex flex-col h-full overflow-y-auto pl-0 md:pl-2 pr-1 space-y-5">
            
            {/* VISTA INVERSIONISTAS */}
            {tipo === 'inversionistas' && (
              <>
                {/* BARRA SUPERIOR CON DROPDOWN DE SELECCIÓN DE INVERSIONISTA */}
                <div className="p-4 rounded-2xl bg-white border border-line shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#0d6b63]">
                      INVERSIONISTA SELECCIONADO
                    </span>
                    <h3 className="text-xl font-serif font-bold text-slate-900 mt-0.5">
                      {inversionistaSeleccionado?.nombre_completo || inversionistaSeleccionado?.nombre || 'Seleccioná un inversionista'}
                    </h3>
                  </div>

                  {/* Selector / Botón para ver y cambiar de Inversionista */}
                  <div className="relative">
                    <button
                      onClick={() => setMenuInversionistasAbierto(!menuInversionistasAbierto)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0d6b63] text-white text-xs font-bold shadow-xs hover:bg-[#0b5a52] transition-colors cursor-pointer"
                    >
                      <Users className="w-4 h-4" />
                      <span>Ver Listado Inversionistas ({listaInversionistas.length})</span>
                      <ChevronDown className="w-4 h-4 ml-1" />
                    </button>

                    {/* Menú Desplegable con todos los Inversionistas */}
                    {menuInversionistasAbierto && (
                      <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-line shadow-2xl z-50 max-h-64 overflow-y-auto p-2">
                        <span className="text-[10px] font-bold uppercase text-slate-400 px-3 py-1 block border-b border-line mb-1">
                          Seleccionar Inversionista
                        </span>
                        {listaInversionistas.map((inv) => (
                          <div
                            key={inv.id}
                            onClick={() => {
                              setInversionistaSeleccionado(inv)
                              setMenuInversionistasAbierto(false)
                            }}
                            className={`p-2.5 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center justify-between ${
                              inversionistaSeleccionado?.id === inv.id
                                ? 'bg-[#0d6b63]/10 text-[#0d6b63]'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span>{inv.nombre_completo || inv.nombre}</span>
                            <span className="text-[10px] font-normal text-slate-400">Tel: {inv.telefono || 's/d'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* FICHA TÉCNICA DEL INVERSIONISTA */}
                {inversionistaSeleccionado && (
                  <>
                    <div className="p-5 rounded-2xl bg-white border border-line shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#0d6b63]">
                            INFORMACIÓN GENERAL (INVERSIONISTA)
                          </span>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            (inversionistaSeleccionado.activo ?? true) ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {(inversionistaSeleccionado.activo ?? true) ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>

                        <h3 className="text-2xl font-serif font-bold text-slate-900 mt-0.5">
                          {inversionistaSeleccionado.nombre_completo || inversionistaSeleccionado.nombre}
                        </h3>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-2.5 font-medium">
                          {inversionistaSeleccionado.dni && <span>🪪 DNI: {inversionistaSeleccionado.dni}</span>}
                          {inversionistaSeleccionado.telefono && <span>📞 Tel: {inversionistaSeleccionado.telefono}</span>}
                          {inversionistaSeleccionado.email && <span>✉️ Email: {inversionistaSeleccionado.email}</span>}
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleEstado(inversionistaSeleccionado, 'usuarios')}
                        disabled={actionLoading}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                          (inversionistaSeleccionado.activo ?? true)
                            ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>{(inversionistaSeleccionado.activo ?? true) ? 'Deshabilitar' : 'Habilitar'}</span>
                      </button>
                    </div>

                    {/* METRICAS FINANCIERAS */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-4 rounded-2xl bg-white border border-line flex flex-col justify-between shadow-xs">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">CAPITAL INVERTIDO</span>
                          <div className="p-2 rounded-xl bg-blue-50 text-blue-700"><DollarSign className="w-4 h-4" /></div>
                        </div>
                        <p className="text-xl font-bold text-slate-900">${totalCapitalInvertido.toLocaleString('es-AR')}</p>
                      </div>

                      <div className="p-4 rounded-2xl bg-white border border-line flex flex-col justify-between shadow-xs">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">GANANCIA ESPERADA</span>
                          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700"><TrendingUp className="w-4 h-4" /></div>
                        </div>
                        <p className="text-xl font-bold text-emerald-700">+${totalInteresesGanados.toLocaleString('es-AR')}</p>
                      </div>

                      <div className="p-4 rounded-2xl bg-white border border-line flex flex-col justify-between shadow-xs">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">CAPITAL TOTAL CON INTERESES</span>
                          <div className="p-2 rounded-xl bg-[#0d6b63]/10 text-[#0d6b63]"><Wallet className="w-4 h-4" /></div>
                        </div>
                        <p className="text-xl font-bold text-[#0d6b63]">${totalRetornoEsperado.toLocaleString('es-AR')}</p>
                      </div>
                    </div>

                    {/* PRÉSTAMOS OTORGADOS */}
               <div>
  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5 flex items-center gap-2">
    <CreditCard className="w-4 h-4 text-[#0d6b63]" />
    Préstamos Otorgados con Capital del Inversor ({prestamos.length})
  </h4>
  {prestamos.length === 0 ? (
    <p className="text-xs text-slate-400 bg-white p-4 rounded-2xl border border-line">
      No posee préstamos vigentes con su capital.
    </p>
  ) : (
    <div className="space-y-2">
      {prestamos.map((p) => {
        // Intentar obtener el nombre del cliente desde la relación traída de Supabase o desde el listado cargado
        const nombreCliente = p.clientes?.nombre_completo 
          || clientesRelacionados.find((c) => c.id === p.cliente_id)?.nombre_completo 
          || 'Cliente'

        return (
          <div key={p.id} className="p-4 rounded-2xl bg-white border border-line flex items-center justify-between">
            <div>
              {/* Etiqueta con el nombre del cliente destinatario */}
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0d6b63] block mb-1">
                Cliente: {nombreCliente}
              </span>
              <span className="text-xs text-slate-500 font-medium block">Monto Capital:</span>
              <span className="text-base font-bold text-[#0d6b63]">
                ${Number(p.monto_capital || p.monto || 0).toLocaleString('es-AR')}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-xs font-bold text-slate-700 block">
                  Retorno Esperado: ${Number(p.monto_total_pagar || p.monto_total || 0).toLocaleString('es-AR')}
                </span>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full inline-block mt-1 ${p.estado === 'finalizado' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}`}>
                  {p.estado === 'finalizado' ? '✓ COBRADO' : p.estado}
                </span>
              </div>
              {onVerFichaPrestamo && (
                <button 
                  onClick={() => onVerFichaPrestamo(p)} 
                  className="p-2.5 rounded-xl bg-[#0d6b63]/10 text-[#0d6b63] hover:bg-[#0d6b63] hover:text-white transition-colors cursor-pointer"
                  title="Ver Ficha Técnica"
                >
                  <Eye className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )}
</div>
                  </>
                )}
              </>
            )}

            {/* VISTA CLIENTE INDIVIDUAL */}
            {tipo === 'clientes' && (
              <>
                {!itemSeleccionado ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <Search className="w-10 h-10 mb-2 opacity-40" />
                    <p className="text-sm font-medium">Seleccioná un cliente para ver su perfil</p>
                  </div>
                ) : fetchingDetalle ? (
                  <div className="flex items-center justify-center h-full text-slate-400">
                    <p className="text-sm font-medium">Cargando detalles...</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="p-5 rounded-2xl bg-white border border-line shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#0d6b63]">
                            INFORMACIÓN GENERAL (CLIENTE)
                          </span>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            (itemSeleccionado.activo ?? true) ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {(itemSeleccionado.activo ?? true) ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>

                        <h3 className="text-2xl font-serif font-bold text-slate-900 mt-0.5">
                          {itemSeleccionado.nombre_completo || itemSeleccionado.nombre}
                        </h3>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-2.5 font-medium">
                          <span className="flex items-center gap-1 bg-[#0d6b63]/10 text-[#0d6b63] font-bold px-2.5 py-1 rounded-xl">
                            Origen: {referidoInfo || 'Cargando...'}
                          </span>

                          {itemSeleccionado.dni && <span>🪪 DNI: {itemSeleccionado.dni}</span>}
                          {itemSeleccionado.telefono && <span>📞 Tel: {itemSeleccionado.telefono}</span>}
                          {itemSeleccionado.email && <span>✉️ Email: {itemSeleccionado.email}</span>}
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleEstado(itemSeleccionado, 'clientes')}
                        disabled={actionLoading}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                          (itemSeleccionado.activo ?? true)
                            ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>{(itemSeleccionado.activo ?? true) ? 'Deshabilitar' : 'Habilitar'}</span>
                      </button>
                    </div>

                    {/* PRÉSTAMOS DEL CLIENTE */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-[#0d6b63]" />
                        Préstamos de este Cliente ({prestamos.length})
                      </h4>
                      {prestamos.length === 0 ? (
                        <p className="text-xs text-slate-400 bg-white p-4 rounded-2xl border border-line">Sin préstamos asignados.</p>
                      ) : (
                        <div className="space-y-2">
                          {prestamos.map((p) => (
                            <div key={p.id} className="p-4 rounded-2xl bg-white border border-line flex items-center justify-between">
                              <div>
                                <span className="text-xs text-slate-500 font-medium block">Capital entregado:</span>
                                <span className="text-base font-bold text-slate-800">
                                  ${Number(p.monto_capital || p.monto || 0).toLocaleString('es-AR')}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${p.estado === 'finalizado' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                    {p.estado === 'finalizado' ? '✓ COBRADO' : p.estado}
                                  </span>
                                  <span className="text-xs text-slate-500 font-bold block mt-1">
                                    Total: ${Number(p.monto_total_pagar || p.monto_total || 0).toLocaleString('es-AR')}
                                  </span>
                                </div>
                                {onVerFichaPrestamo && (
                                  <button onClick={() => onVerFichaPrestamo(p)} className="p-2.5 rounded-xl bg-[#0d6b63]/10 text-[#0d6b63] hover:bg-[#0d6b63] hover:text-white transition-colors cursor-pointer">
                                    <Eye className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* HISTORIAL DE COBROS */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5 flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-[#0d6b63]" />
                        Historial de Cobros Recibidos ({pagos.length})
                      </h4>
                      {pagos.length === 0 ? (
                        <p className="text-xs text-slate-400 bg-white p-4 rounded-2xl border border-line">No posee cobros registrados.</p>
                      ) : (
                        <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                          {pagos.map((pago) => (
                            <div key={pago.id} className="p-3.5 rounded-2xl bg-white border border-line flex items-center justify-between text-xs">
                              <div>
                                <span className="font-bold text-slate-900 text-sm">
                                  ${Number(pago.monto_cobrado || pago.monto_pago || 0).toLocaleString('es-AR')}
                                </span>
                                <span className="text-slate-500 ml-2 font-medium">({pago.metodo_pago})</span>
                              </div>
                              <span className="text-slate-600 font-bold bg-slate-100 px-3 py-1 rounded-xl">
                                {formatearFecha(pago.fecha_pago)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

          </div>

        </div>

      </div>
    </div>
  )
}