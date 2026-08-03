import React, { useState, useEffect } from 'react'
import { X, Search, User, Briefcase, Receipt, CreditCard, ChevronRight, Power, Eye } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

export default function ModalDirectorio({ isOpen, onClose, tipoInicial = 'clientes', onVerFichaPrestamo }) {
  const [tipo, setTipo] = useState(tipoInicial) // 'clientes' o 'inversionistas'
  const [busqueda, setBusqueda] = useState('')
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(false)

  // Selección de Perfil
  const [itemSeleccionado, setItemSeleccionado] = useState(null)
  const [referidoInfo, setReferidoInfo] = useState(null)
  const [prestamos, setPrestamos] = useState([])
  const [pagos, setPagos] = useState([])
  const [clientesRelacionados, setClientesRelacionados] = useState([])
  const [fetchingDetalle, setFetchingDetalle] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // 1. Resetear estados al abrir/cerrar modal
  useEffect(() => {
    if (isOpen) {
      setTipo(tipoInicial)
      setBusqueda('')
      setItemSeleccionado(null)
      setReferidoInfo(null)
      setLista([])
      setPrestamos([])
      setPagos([])
      setClientesRelacionados([])
    } else {
      setItemSeleccionado(null)
      setReferidoInfo(null)
      setLista([])
      setPrestamos([])
      setPagos([])
      setClientesRelacionados([])
    }
  }, [isOpen, tipoInicial])

  // 2. Cargar TODOS los perfiles (activos e inactivos) para verlos en la lista del directorio
  useEffect(() => {
    if (!isOpen) return
    let isMounted = true

    async function fetchData() {
      setLoading(true)

      try {
        const tabla = tipo === 'clientes' ? 'clientes' : 'usuarios'
        
        // 👈 Traemos todos los registros para mantener la visibilidad en el directorio
        let query = supabase.from(tabla).select('*')

        if (tipo === 'clientes') {
          query = query.order('nombre_completo', { ascending: true })
        } else {
          query = query.order('nombre_completo', { ascending: true })
        }

        if (busqueda.trim() !== '') {
          if (tipo === 'clientes') {
            query = query.ilike('nombre_completo', `%${busqueda}%`)
          } else {
            query = query.or(`nombre_completo.ilike.%${busqueda}%,nombre.ilike.%${busqueda}%`)
          }
        }

        const { data, error } = await query
        if (error) throw error

        if (isMounted) {
          setLista(data || [])
          if (data && data.length > 0) {
            cargarDetallePerfil(data[0], tipo)
          } else {
            setItemSeleccionado(null)
            setReferidoInfo(null)
            setPrestamos([])
            setPagos([])
            setClientesRelacionados([])
          }
        }
      } catch (err) {
        console.error(`Error al cargar lista de ${tipo}:`, err)
        if (isMounted) setLista([])
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchData()

    return () => { isMounted = false }
  }, [tipo, busqueda, isOpen])

  // 3. Cargar detalle del perfil seleccionado
  const cargarDetallePerfil = async (item, tipoActual) => {
    if (!item) return
    setItemSeleccionado(item)
    setFetchingDetalle(true)
    setReferidoInfo(null)
    setPrestamos([])
    setPagos([])
    setClientesRelacionados([])

    try {
      if (tipoActual === 'clientes') {
        if (item.inversionista_id) {
          const { data: invData } = await supabase
            .from('usuarios')
            .select('nombre_completo, nombre')
            .eq('id', item.inversionista_id)
            .maybeSingle()

          if (invData) {
            setReferidoInfo(invData.nombre_completo || invData.nombre)
          } else {
            setReferidoInfo('Propio (Administrador)')
          }
        } else {
          setReferidoInfo('Propio (Administrador)')
        }

        const { data: prestamosData } = await supabase
          .from('prestamos')
          .select('*')
          .eq('cliente_id', item.id)
          .order('fecha_inicio', { ascending: false })

        setPrestamos(prestamosData || [])

        const { data: pagosData } = await supabase
          .from('pagos')
          .select('*')
          .eq('cliente_id', item.id)
          .order('fecha_pago', { ascending: false })

        setPagos(pagosData || [])

      } else {
        let { data: prestamosData, error: errP } = await supabase
          .from('prestamos')
          .select('*')
          .eq('inversionista_id', item.id)
          .order('fecha_inicio', { ascending: false })

        if (errP || !prestamosData || prestamosData.length === 0) {
          const { data: pAlt } = await supabase
            .from('prestamos')
            .select('*')
            .eq('usuario_id', item.id)
            .order('fecha_inicio', { ascending: false })

          if (pAlt && pAlt.length > 0) prestamosData = pAlt
        }

        const prestamosFinales = prestamosData || []
        setPrestamos(prestamosFinales)

        if (prestamosFinales.length > 0) {
          const clienteIds = [...new Set(prestamosFinales.map((p) => p.cliente_id))].filter(Boolean)
          if (clienteIds.length > 0) {
            const { data: clientesData } = await supabase
              .from('clientes')
              .select('*')
              .in('id', clienteIds)
            setClientesRelacionados(clientesData || [])
          }
        }
      }
    } catch (err) {
      console.error('Error al cargar detalle del perfil:', err)
    } finally {
      setFetchingDetalle(false)
    }
  }

  // ACCIÓN: Alternar Habilitar / Deshabilitar (Guarda el estado real en DB)
  const handleToggleEstado = async () => {
    if (!itemSeleccionado) return
    setActionLoading(true)

    const tabla = tipo === 'clientes' ? 'clientes' : 'usuarios'
    const nuevoEstado = !(itemSeleccionado.activo ?? true)

    try {
      const { data, error } = await supabase
        .from(tabla)
        .update({ activo: nuevoEstado })
        .eq('id', itemSeleccionado.id)
        .select()

      if (error) throw error

      if (!data || data.length === 0) {
        alert('No se pudo actualizar el registro en Supabase. Verificá los permisos RLS en Supabase.')
        return
      }

      // 👈 Se actualiza el objeto en el estado local sin borrarlo de la lista
      const itemActualizado = { ...itemSeleccionado, activo: nuevoEstado }
      setItemSeleccionado(itemActualizado)
      setLista((prev) => prev.map((e) => (e.id === itemSeleccionado.id ? itemActualizado : e)))
    } catch (err) {
      console.error('Error al cambiar estado:', err)
      alert(`Error al actualizar en la DB: ${err.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  const formatearFecha = (fechaRaw) => {
    if (!fechaRaw) return ''
    const fecha = fechaRaw.split('T')[0]
    const [year, month, day] = fecha.split('-')
    return `${day}/${month}/${year}`
  }

  const renderBadgeEstadoPrestamo = (estado) => {
  if (estado === 'finalizado') {
    return (
      <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
        ✓ COBRADO
      </span>
    )
  }

  if (estado === 'activo') {
    return (
      <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
        ACTIVO
      </span>
    )
  }

  return (
    <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
      {estado}
    </span>
  )
}

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="w-full max-w-5xl rounded-3xl bg-cream p-6 sm:p-8 shadow-2xl border border-line h-[88vh] flex flex-col overflow-hidden">
        
        {/* Cabecera y Selector de Tab */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-line shrink-0">
          <div>
            <span className="text-[11px] font-bold tracking-widest uppercase text-[#0d6b63]">
              DIRECTORIO DE BÚSQUEDA
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1d2939]">
              {tipo === 'clientes' ? 'Perfil de Clientes' : 'Perfil de Inversionistas'}
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
          
          {/* COLUMNA IZQUIERDA: Buscador y Lista */}
          <div className="md:col-span-4 flex flex-col h-full border-r border-line/60 pr-0 md:pr-4 overflow-hidden">
            <div className="relative mb-3 shrink-0">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={`Buscar ${tipo}...`}
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white rounded-2xl border border-line text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0d6b63]/20 focus:border-[#0d6b63]"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {loading ? (
                <p className="text-xs text-slate-400 text-center py-6">Cargando lista...</p>
              ) : lista.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No hay {tipo} registrados.</p>
              ) : (
                lista.map((item) => {
                  const estaActivo = item.activo ?? true
                  return (
                    <div
                      key={item.id}
                      onClick={() => cargarDetallePerfil(item, tipo)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        itemSeleccionado?.id === item.id
                          ? 'bg-[#0d6b63] text-white border-[#0d6b63] shadow-sm'
                          : 'bg-white border-line text-slate-800 hover:border-slate-300'
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
                        <span className={`text-[11px] ${itemSeleccionado?.id === item.id ? 'text-white/80' : 'text-slate-500'}`}>
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

          {/* COLUMNA DERECHA: Detalle del Perfil */}
          <div className="md:col-span-8 flex flex-col h-full overflow-y-auto pl-0 md:pl-2 pr-1">
            {!itemSeleccionado ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Search className="w-10 h-10 mb-2 opacity-40" />
                <p className="text-sm font-medium">Seleccioná un perfil para ver su información</p>
              </div>
            ) : fetchingDetalle ? (
              <div className="flex items-center justify-center h-full text-slate-400">
                <p className="text-sm font-medium">Cargando detalles...</p>
              </div>
            ) : (
              <div className="space-y-5">
                
                {/* Datos Personales y Botón Habilitar/Deshabilitar */}
                <div className="p-5 rounded-2xl bg-white border border-line shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#0d6b63]">
                        INFORMACIÓN GENERAL ({tipo === 'clientes' ? 'CLIENTE' : 'INVERSIONISTA'})
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
                      {tipo === 'clientes' && (
                        <span className="flex items-center gap-1 bg-[#0d6b63]/10 text-[#0d6b63] font-bold px-2.5 py-1 rounded-xl">
                          👤 Origen: {referidoInfo || 'Cargando...'}
                        </span>
                      )}

                      {itemSeleccionado.dni && <span>🪪 DNI: {itemSeleccionado.dni}</span>}
                      {itemSeleccionado.telefono && <span>📞 Tel: {itemSeleccionado.telefono}</span>}
                      {itemSeleccionado.email && <span>✉️ Email: {itemSeleccionado.email}</span>}
                      {itemSeleccionado.direccion && <span>📍 Dir: {itemSeleccionado.direccion}</span>}
                    </div>
                  </div>

                  {/* Botón para alternar estado */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={handleToggleEstado}
                      disabled={actionLoading}
                      title={(itemSeleccionado.activo ?? true) ? "Deshabilitar perfil" : "Habilitar perfil"}
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
                </div>

                {/* VISTA CLIENTE */}
                {tipo === 'clientes' && (
                  <>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-[#0d6b63]" />
                        Préstamos de este Cliente ({prestamos.length})
                      </h4>
                      {prestamos.length === 0 ? (
                        <p className="text-xs text-slate-400 bg-white p-4 rounded-2xl border border-line">Sin préstamos asignados a este cliente.</p>
                      ) : (
                        <div className="space-y-2">
                          {prestamos.map((p) => (
                            <div key={p.id} className="p-4 rounded-2xl bg-white border border-line flex items-center justify-between">
                              <div>
                                <span className="text-xs text-slate-500 font-medium block">
                                  Capital entregado:
                                </span>
                                <span className="text-base font-bold text-slate-800">
                                  ${Number(p.monto_capital || 0).toLocaleString('es-AR')} 
                                  <span className="text-xs font-normal text-slate-500 ml-1">({p.cantidad_cuotas} cuotas {p.frecuencia || 'mensual'})</span>
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                                    p.estado === 'activo' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {p.estado}
                                  </span>
                                  <span className="text-xs text-slate-500 font-bold block mt-1">
                                    Total a devolver: ${Number(p.monto_total_pagar || 0).toLocaleString('es-AR')}
                                  </span>
                                </div>
                                {onVerFichaPrestamo && (
                                  <button
                                    onClick={() => onVerFichaPrestamo(p)}
                                    title="Ver Ficha Técnica"
                                    className="p-2.5 rounded-xl bg-[#0d6b63]/10 text-[#0d6b63] hover:bg-[#0d6b63] hover:text-white transition-colors cursor-pointer"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

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
                                {pago.observaciones && <p className="text-[11px] text-slate-400 italic mt-0.5">{pago.observaciones}</p>}
                              </div>
                              <span className="text-slate-600 font-bold bg-slate-100 px-3 py-1 rounded-xl">
                                {formatearFecha(pago.fecha_pago)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* VISTA INVERSIONISTA */}
                {tipo === 'inversionistas' && (
                  <>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5 flex items-center gap-2">
                        <User className="w-4 h-4 text-[#0d6b63]" />
                        Clientes Financiados por este Inversor ({clientesRelacionados.length})
                      </h4>
                      {clientesRelacionados.length === 0 ? (
                        <p className="text-xs text-slate-400 bg-white p-4 rounded-2xl border border-line">Sin clientes asignados a este inversionista.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {clientesRelacionados.map((c) => (
                            <div key={c.id} className="p-3 rounded-2xl bg-white border border-line flex items-center gap-3">
                              <div className="p-2.5 rounded-xl bg-[#0d6b63]/10 text-[#0d6b63]">
                                <User className="w-4 h-4" />
                              </div>
                              <div>
                                <h5 className="font-bold text-xs text-slate-800">{c.nombre_completo}</h5>
                                <span className="text-[11px] text-slate-500">Tel: {c.telefono || 'Sin teléfono'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-[#0d6b63]" />
                        Préstamos Otorgados con Capital del Inversor ({prestamos.length})
                      </h4>
                      {prestamos.length === 0 ? (
                        <p className="text-xs text-slate-400 bg-white p-4 rounded-2xl border border-line">No posee préstamos vigentes con su capital.</p>
                      ) : (
                        <div className="space-y-2">
                          {prestamos.map((p) => (
                            <div key={p.id} className="p-4 rounded-2xl bg-white border border-line flex items-center justify-between">
                              <div>
                                <span className="text-xs text-slate-500 font-medium block">
                                  Monto Capital:
                                </span>
                                <span className="text-base font-bold text-[#0d6b63]">
                                  ${Number(p.monto_capital || 0).toLocaleString('es-AR')}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <span className="text-xs font-bold text-slate-700 block">
                                    Retorno Esperado: ${Number(p.monto_total_pagar || 0).toLocaleString('es-AR')}
                                  </span>
                                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full inline-block mt-1 ${
                                    p.estado === 'activo' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {p.estado}
                                  </span>
                                </div>
                                {onVerFichaPrestamo && (
                                  <button
                                    onClick={() => onVerFichaPrestamo(p)}
                                    title="Ver Ficha Técnica"
                                    className="p-2.5 rounded-xl bg-[#0d6b63]/10 text-[#0d6b63] hover:bg-[#0d6b63] hover:text-white transition-colors cursor-pointer"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  )
}