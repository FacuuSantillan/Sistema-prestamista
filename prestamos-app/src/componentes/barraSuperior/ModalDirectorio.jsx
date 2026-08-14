import React, { useState, useEffect } from 'react'
import { 
  User, 
  Briefcase, 
  X, 
  Users, 
  ChevronDown,
  ChevronRight, 
  Power, 
  DollarSign, 
  TrendingUp, 
  Wallet, 
  CreditCard, 
  Eye, 
  Search, 
  Receipt 
} from 'lucide-react'
import { supabase } from '../../lib/supabaseClient' // Ajusta la ruta a tu cliente de Supabase

export default function ModalDirectorio({ 
  isOpen, 
  onClose, 
  tipoInicial = 'clientes', 
  itemInicialId = null, 
  onVerFichaPrestamo,
  usuarioLogueado = null, // 👈 Se recibe el objeto del usuario logueado
  rolUsuario = "admin"
}) {
  // Determinar rol real
  const rolReal = usuarioLogueado?.rol || rolUsuario
  const esInversionista = rolReal === 'inversionista'

  // Si es inversionista, se fuerza la pestaña 'clientes'
  const [tipo, setTipo] = useState(esInversionista ? 'clientes' : tipoInicial)
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
      setTipo(esInversionista ? 'clientes' : tipoInicial)
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
  }, [isOpen, tipoInicial, esInversionista])

  // Cargar lista según el tipo seleccionado y el Rol del Usuario
  useEffect(() => {
    if (!isOpen) return
    let isMounted = true

    async function fetchData() {
      setLoading(true)

      try {
        if (tipo === 'clientes') {
          let listaData = []

          // 🔴 CASO 1: SI ES INVERSIONISTA -> Filtrar solo sus clientes asignados
          if (esInversionista && usuarioLogueado?.id) {
            const invId = usuarioLogueado.id

            // 1. Obtener préstamos de este inversionista
            const { data: prestamosInversor, error: errP } = await supabase
              .from('prestamos')
              .select('cliente_id')
              .eq('inversionista_id', invId)

            if (errP) console.warn('Aviso al cargar préstamos del inversor:', errP.message)

            const clienteIds = [...new Set((prestamosInversor || []).map((p) => p.cliente_id))].filter(Boolean)

            // 2. Traer clientes relacionados a sus préstamos o asignados directamente
            let queryInversor = supabase.from('clientes').select('*')

            if (clienteIds.length > 0) {
              queryInversor = queryInversor.or(`inversionista_id.eq.${invId},id.in.(${clienteIds.join(',')})`)
            } else {
              queryInversor = queryInversor.eq('inversionista_id', invId)
            }

            queryInversor = queryInversor.order('nombre_completo', { ascending: true })

            if (busqueda.trim() !== '') {
              queryInversor = queryInversor.ilike('nombre_completo', `%${busqueda}%`)
            }

            const { data: clientesData, error: errC } = await queryInversor
            if (errC) throw errC

            listaData = clientesData || []
          } 
          // 🟢 CASO 2: OWNER / ADMIN -> Traer todos los clientes
          else {
            let query = supabase.from('clientes').select('*').order('nombre_completo', { ascending: true })

            if (busqueda.trim() !== '') {
              query = query.ilike('nombre_completo', `%${busqueda}%`)
            }

            const { data, error } = await query
            if (error) throw error

            listaData = data || []
          }

          if (isMounted) {
            setLista(listaData)

            if (listaData.length > 0) {
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
          // VISTA INVERSIONISTAS (Solo Owner / Admin)
          const { data: invs, error: errInv } = await supabase
            .from('usuarios')
            .select('*')
            .eq('rol', 'inversionista')
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
  }, [tipo, busqueda, isOpen, esInversionista, usuarioLogueado?.id])

  // Cargar préstamos y clientes del inversionista seleccionado (Solo para Owner/Admin)
  useEffect(() => {
    if (tipo !== 'inversionistas' || !inversionistaSeleccionado || esInversionista) return

    let isMounted = true

    async function cargarClientesDelInversionista() {
      setLoading(true)
      try {
        const invId = inversionistaSeleccionado.id

        // 1. Obtener Préstamos otorgados por ESTE inversionista
        const { data: prestamosData, error: errP } = await supabase
          .from('prestamos')
          .select('*')
          .eq('inversionista_id', invId)
          .order('fecha_inicio', { ascending: false })

        if (errP) console.warn('Aviso al cargar préstamos del inversionista:', errP.message)

        const prestamosFinales = prestamosData || []
        if (isMounted) setPrestamos(prestamosFinales)

        // 2. Extraer IDs de clientes
        const clienteIdsDePrestamos = [...new Set(prestamosFinales.map((p) => p.cliente_id))].filter(Boolean)

        // 3. Buscar clientes asignados
        let queryClientes = supabase.from('clientes').select('*')

        if (clienteIdsDePrestamos.length > 0) {
          queryClientes = queryClientes.or(`inversionista_id.eq.${invId},id.in.(${clienteIdsDePrestamos.join(',')})`)
        } else {
          queryClientes = queryClientes.eq('inversionista_id', invId)
        }

        queryClientes = queryClientes.order('nombre_completo', { ascending: true })

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
  }, [inversionistaSeleccionado, tipo, busqueda, esInversionista])

  // Cargar detalle individual de cliente
  const cargarDetallePerfil = async (item, tipoActual) => {
    if (!item) return
    setItemSeleccionado(item)
    setFetchingDetalle(true)
    setReferidoInfo(null)
    setPrestamos([])
    setPagos([])

    try {
      if (tipoActual === 'clientes') {
        // 1. Préstamos
        const { data: prestamosData } = await supabase
          .from('prestamos')
          .select('*')
          .eq('cliente_id', item.id)
          .order('fecha_inicio', { ascending: false })

        const prestamosFinales = prestamosData || []
        setPrestamos(prestamosFinales)

        // 2. Pagos
        const { data: pagosData } = await supabase
          .from('pagos')
          .select('*, clientes(nombre_completo)')
          .eq('cliente_id', item.id)
          .order('fecha_pago', { ascending: false })

        setPagos(pagosData || [])

        // 3. Inversionista
        let idInversionista = item.inversionista_id || item.usuario_id

        if (!idInversionista && prestamosFinales.length > 0) {
          const prestamoConInversionista = prestamosFinales.find((p) => p.inversionista_id)
          if (prestamoConInversionista) {
            idInversionista = prestamoConInversionista.inversionista_id
          }
        }

        if (idInversionista) {
          const { data: invData, error: errInv } = await supabase
            .from('usuarios')
            .select('*')
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

  // Navegar al perfil de cliente
  const handleIrAPerfilCliente = (cliente) => {
    if (!cliente) return
    setItemSeleccionado(cliente)
    setTipo('clientes')
    cargarDetallePerfil(cliente, 'clientes')
  }

  // Alternar Habilitar/Deshabilitar
  const handleToggleEstado = async (targetItem, tablaNombre) => {
    if (!targetItem) return
    setActionLoading(true)

    const nuevoEstado = !(targetItem.activo ?? true)

    try {
      const { error } = await supabase
        .from(tablaNombre)
        .update({ activo: nuevoEstado })
        .eq('id', targetItem.id)

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

  // Métricas financieras
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs select-none">
      <div className="w-full max-w-5xl rounded-3xl bg-cream p-6 sm:p-8 shadow-2xl border border-line h-[88vh] flex flex-col overflow-hidden">
        
        {/* CABECERA */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-line shrink-0">
          <div>
            <span className="text-[11px] font-bold tracking-widest uppercase text-[#0d6b63]">
              DIRECTORIO DE BÚSQUEDA
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1d2939]">
              {esInversionista 
                ? 'Mis Clientes Asociados' 
                : (tipo === 'clientes' ? 'Perfil de Clientes' : 'Perfil de Inversionistas')}
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

            {!esInversionista && (
              <button
                onClick={() => setTipo('inversionistas')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  tipo === 'inversionistas' ? 'bg-[#0d6b63] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                <span>Inversionistas</span>
              </button>
            )}

            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 🔴 VISTA 1: INVERSIONISTAS (FILTRADO POR ROL STRICTO - SOLO OWNER / ADMIN) */}
        {tipo === 'inversionistas' && !esInversionista ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4 flex-1 overflow-hidden">
            
            {/* IZQUIERDA (md:col-span-8): Ficha del Inversionista, Métricas y Préstamos */}
            <div className="md:col-span-8 flex flex-col h-full overflow-y-auto pr-1 space-y-5">
              
              {/* Selector de Inversionista */}
              <div className="p-4 rounded-2xl bg-white border border-line shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#0d6b63]">
                    INVERSIONISTA SELECCIONADO
                  </span>
                  <h3 className="text-xl font-serif font-bold text-slate-900 mt-0.5">
                    {inversionistaSeleccionado?.nombre_completo || inversionistaSeleccionado?.nombre || 'Seleccioná un inversionista'}
                  </h3>
                </div>

                <div className="relative">
                  {(() => {
                    const soloInversionistas = listaInversionistas.filter(
                      (inv) => inv.rol === 'inversionista'
                    );

                    return (
                      <>
                        <button
                          onClick={() => setMenuInversionistasAbierto(!menuInversionistasAbierto)}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0d6b63] text-white text-xs font-bold shadow-xs hover:bg-[#0b5a52] transition-colors cursor-pointer"
                        >
                          <Users className="w-4 h-4" />
                          <span>Ver Listado Inversionistas ({soloInversionistas.length})</span>
                          <ChevronDown className="w-4 h-4 ml-1" />
                        </button>

                        {menuInversionistasAbierto && (
                          <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-line shadow-2xl z-50 max-h-64 overflow-y-auto p-2">
                            <span className="text-[10px] font-bold uppercase text-slate-400 px-3 py-1 block border-b border-line mb-1">
                              Seleccionar Inversionista
                            </span>
                            
                            {soloInversionistas.length === 0 ? (
                              <div className="p-3 text-xs text-slate-400 text-center font-medium">
                                No hay inversionistas registrados
                              </div>
                            ) : (
                              soloInversionistas.map((inv) => (
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
                                  <span className="text-[10px] font-normal text-slate-400">
                                    Tel: {inv.telefono || 's/d'}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Ficha General */}
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

                    {!esInversionista && (
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
                    )}
                  </div>

                  {/* Métricas Financieras */}
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

                  {/* Préstamos Otorgados */}
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
                          const nombreCliente = p.clientes?.nombre_completo 
                            || clientesRelacionados.find((c) => c.id === p.cliente_id)?.nombre_completo 
                            || 'Cliente'

                          return (
                            <div key={p.id} className="p-4 rounded-2xl bg-white border border-line flex items-center justify-between">
                              <div>
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
            </div>

            {/* DERECHA (md:col-span-4): LISTADO DE CLIENTES FINANCIADOS / ASOCIADOS */}
            <div className="md:col-span-4 flex flex-col h-full border-l border-line/60 pl-0 md:pl-4 overflow-hidden">
              <div className="relative mb-3 shrink-0">
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar cliente financiado..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white rounded-2xl border border-line text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0d6b63]/20 focus:border-[#0d6b63]"
                />
              </div>

              <div className="mb-2 px-1 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  CLIENTES FINANCIADOS ({lista.length})
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {loading ? (
                  <p className="text-xs text-slate-400 text-center py-6">Cargando lista...</p>
                ) : lista.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">
                    Sin clientes asignados a este inversor.
                  </p>
                ) : (
                  lista.map((item) => {
                    const estaActivo = item.activo ?? true

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleIrAPerfilCliente(item)}
                        className="p-3.5 rounded-2xl border border-line bg-white text-slate-800 hover:border-[#0d6b63] transition-all cursor-pointer flex items-center justify-between group shadow-2xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm leading-tight group-hover:text-[#0d6b63] transition-colors">
                              {item.nombre_completo || item.nombre || 'Sin nombre'}
                            </h4>
                            {!estaActivo && (
                              <span className="text-[9px] font-bold uppercase bg-red-100 text-red-700 px-1.5 py-0.5 rounded-md">
                                Inactivo
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 block mt-0.5">
                            Tel: {item.telefono || 'Sin teléfono'}
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#0d6b63] transition-colors" />
                      </div>
                    )
                  })
                )}
              </div>
            </div>

          </div>
        ) : (
          /* VISTA 2: CLIENTES INDIVIDUALES (ACCESIBLE POR TODOS) */
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4 flex-1 overflow-hidden">
            
            {/* Lista Lateral de Clientes */}
            <div className="md:col-span-4 flex flex-col h-full border-r border-line/60 pr-0 md:pr-4 overflow-hidden">
              <div className="relative mb-3 shrink-0">
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar clientes..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white rounded-2xl border border-line text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0d6b63]/20 focus:border-[#0d6b63]"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {loading ? (
                  <p className="text-xs text-slate-400 text-center py-6">Cargando lista...</p>
                ) : lista.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">
                    {esInversionista ? 'No posees clientes asociados.' : 'No hay clientes registrados.'}
                  </p>
                ) : (
                  lista.map((item) => {
                    const estaActivo = item.activo ?? true
                    const esSeleccionado = itemSeleccionado?.id === item.id

                    return (
                      <div
                        key={item.id}
                        onClick={() => cargarDetallePerfil(item, 'clientes')}
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

            {/* Ficha Técnica del Cliente Seleccionado */}
            <div className="md:col-span-8 flex flex-col h-full overflow-y-auto pl-0 md:pl-2 pr-1 space-y-5">
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

                    {!esInversionista && (
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
                    )}
                  </div>

                  {/* Préstamos del Cliente */}
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

                  {/* Historial de Cobros del Cliente */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5 flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-[#0d6b63]" />
                      Historial de Cobros Recibidos ({pagos.length})
                    </h4>
                    {pagos.length === 0 ? (
                      <p className="text-xs text-slate-400 bg-white p-4 rounded-2xl border border-line">No posee cobros registrados.</p>
                    ) : (
                      <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                        {pagos.map((pago) => {
                          const nombreCliente = pago.clientes?.nombre_completo || itemSeleccionado?.nombre_completo || 'Cliente'

                          return (
                            <div key={pago.id} className="p-3.5 rounded-2xl bg-white border border-line flex items-center justify-between text-xs">
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0d6b63] block mb-0.5">
                                  Cliente: {nombreCliente}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 text-sm">
                                    ${Number(pago.monto_cobrado || pago.monto_pago || 0).toLocaleString('es-AR')}
                                  </span>
                                  <span className="text-slate-500 font-medium">({pago.metodo_pago || 'Efectivo'})</span>
                                </div>
                              </div>
                              <span className="text-slate-600 font-bold bg-slate-100 px-3 py-1 rounded-xl shrink-0">
                                {formatearFecha(pago.fecha_pago)}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  )
}