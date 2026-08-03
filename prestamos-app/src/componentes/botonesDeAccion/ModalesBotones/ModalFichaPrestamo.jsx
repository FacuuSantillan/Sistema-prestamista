import React, { useState, useEffect } from 'react'
import { X, Calendar, DollarSign, User, Briefcase, CheckCircle2, Clock, Percent } from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'

export default function ModalFichaPrestamo({ isOpen, onClose, prestamo }) {
  const [pagos, setPagos] = useState([])
  const [cliente, setCliente] = useState(null)
  const [inversionista, setInversionista] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen || !prestamo) return

    async function loadFichaDetalles() {
      setLoading(true)
      setCliente(null)
      setInversionista(null)

      try {
        // 1. Cargar pagos del préstamo
        const { data: pagosData } = await supabase
          .from('pagos')
          .select('*')
          .eq('prestamo_id', prestamo.id)
          .order('fecha_pago', { ascending: false })

        setPagos(pagosData || [])

        // 2. Cargar datos del cliente (con fallback si viene anidado)
        const clienteId = prestamo.cliente_id || prestamo.clientes?.id

        if (clienteId) {
          const { data: cliData, error: cliErr } = await supabase
            .from('clientes')
            .select('*')
            .eq('id', clienteId)

          if (!cliErr && cliData && cliData.length > 0) {
            setCliente(cliData[0])
          } else if (prestamo.clientes) {
            setCliente(prestamo.clientes)
          } else {
            setCliente({ nombre_completo: 'Cliente no encontrado' })
          }
        } else if (prestamo.clientes) {
          setCliente(prestamo.clientes)
        } else {
          setCliente({ nombre_completo: 'Sin cliente asignado' })
        }

        // 3. Cargar datos del inversionista / fondeador
        const invId = prestamo.inversionista_id || prestamo.usuario_id

        if (invId) {
          const { data: invData, error: invErr } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id', invId)

          if (!invErr && invData && invData.length > 0) {
            setInversionista(invData[0])
          } else {
            setInversionista(null)
          }
        } else {
          setInversionista(null)
        }
      } catch (err) {
        console.error('Error al cargar ficha técnica del préstamo:', err)
        setCliente({ nombre_completo: 'Error al cargar datos' })
      } finally {
        setLoading(false)
      }
    }

    loadFichaDetalles()
  }, [isOpen, prestamo])

  if (!isOpen || !prestamo) return null

  // --- CÁLCULOS FINANCIEROS Y DE CUOTAS ---
  const capital = Number(prestamo.monto_capital || 0)
  const totalDevolver = Number(prestamo.monto_total_pagar || prestamo.monto_total || 0)
  const interesGenerado = Math.max(0, totalDevolver - capital)
  const tasaCalculada = prestamo.tasa_interes ?? (capital > 0 ? ((interesGenerado / capital) * 100).toFixed(1) : 0)

  const totalPagado = pagos.reduce((acc, p) => acc + Number(p.monto_cobrado || p.monto_pago || 0), 0)
  const saldoPendiente = Math.max(0, totalDevolver - totalPagado)

  const cantidadCuotas = Math.max(1, Number(prestamo.cantidad_cuotas || prestamo.plazo_cuotas || 1))
  const valorCuota = Number(prestamo.monto_cuota) || (totalDevolver / cantidadCuotas)

  const cuotasCompletadas = Math.floor(totalPagado / (valorCuota || 1))
  const cuotasPagadas = Math.min(cantidadCuotas, cuotasCompletadas)
  const porcentajeProgreso = Math.min(100, Math.round((totalPagado / (totalDevolver || 1)) * 100))

  const formatearFecha = (fechaRaw) => {
    if (!fechaRaw) return 'N/A'
    const fecha = fechaRaw.split('T')[0]
    const [year, month, day] = fecha.split('-')
    return `${day}/${month}/${year}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
 
<div className="w-full max-w-3xl rounded-3xl bg-cream p-6 sm:p-8 shadow-2xl border border-line max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-4 border-b border-line shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold tracking-widest uppercase text-[#0d6b63]">
                FICHA TÉCNICA DE PRÉSTAMO
              </span>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                prestamo.estado === 'activo' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
              }`}>
                {prestamo.estado}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 mt-0.5">
              Préstamo #{prestamo.id?.slice(0, 8)}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido Desplazable */}
        <div className="flex-1 overflow-y-auto space-y-6 pt-4 pr-1">
          
          {/* Fila 1: Cliente y Origen */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-line flex items-center gap-3">
              <div className="p-3 rounded-xl bg-[#0d6b63]/10 text-[#0d6b63]">
                <User className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Cliente Asignado</span>
                <h4 className="font-bold text-sm text-slate-900">
                  {cliente ? (cliente.nombre_completo || cliente.nombre || 'Sin nombre') : 'Cargando...'}
                </h4>
                {cliente?.telefono && <span className="text-xs text-slate-500">Tel: {cliente.telefono}</span>}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-line flex items-center gap-3">
              <div className="p-3 rounded-xl bg-[#0d6b63]/10 text-[#0d6b63]">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Fondeador / Inversionista</span>
                <h4 className="font-bold text-sm text-slate-900">
                  {inversionista ? (inversionista.nombre_completo || inversionista.nombre) : 'Propio (Administrador)'}
                </h4>
                <span className="text-xs text-slate-500">Origen de Capital</span>
              </div>
            </div>
          </div>

          {/* Fila 2: Tarjetas Métricas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-white border border-line">
              <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-[#0d6b63]" /> Capital
              </span>
              <p className="text-lg font-bold text-slate-900 mt-1">${capital.toLocaleString('es-AR')}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-line">
              <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-[#0d6b63]" /> Interés ({tasaCalculada}%)
              </span>
              <p className="text-lg font-bold text-emerald-700 mt-1">+${interesGenerado.toLocaleString('es-AR')}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-line">
              <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Total Cobrado
              </span>
              <p className="text-lg font-bold text-emerald-600 mt-1">${totalPagado.toLocaleString('es-AR')}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-line">
              <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" /> Saldo Restante
              </span>
              <p className="text-lg font-bold text-amber-600 mt-1">${saldoPendiente.toLocaleString('es-AR')}</p>
            </div>
          </div>

          {/* Barra de Progreso de Cobro */}
          <div className="p-4 rounded-2xl bg-white border border-line">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
              <span>PROGRESO DE CANCELACIÓN</span>
              <span>{porcentajeProgreso}% Recaudado</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#0d6b63] transition-all duration-500 rounded-full"
                style={{ width: `${porcentajeProgreso}%` }}
              />
            </div>
          </div>

          {/* Detalles del Plan y Esquema de Cuotas */}
          <div className="p-4 rounded-2xl bg-white border border-line grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px] block">Total A Devolver</span>
              <span className="font-bold text-slate-900 text-sm">${totalDevolver.toLocaleString('es-AR')}</span>
            </div>

            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px] block">Cuotas Pagadas</span>
              <span className="font-bold text-slate-900 text-sm">{cuotasPagadas} de {cantidadCuotas} cuotas</span>
            </div>

            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px] block">Valor de Cuota</span>
              <span className="font-bold text-slate-900 text-sm">${valorCuota.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
            </div>

            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px] block">Frecuencia</span>
              <span className="font-bold text-slate-900 text-sm capitalize">{prestamo.frecuencia || 'Mensual'}</span>
            </div>

            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px] block">Fecha de Emisión</span>
              <span className="font-bold text-slate-900 text-sm">{formatearFecha(prestamo.fecha_inicio)}</span>
            </div>
          </div>

          {/* Historial de Cobros de este Préstamo */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#0d6b63]" />
              Historial de Pagos de este Préstamo ({pagos.length})
            </h4>

            {loading ? (
              <p className="text-xs text-slate-400 py-4 text-center">Cargando pagos...</p>
            ) : pagos.length === 0 ? (
              <p className="text-xs text-slate-400 bg-white p-4 rounded-2xl border border-line">Aún no se han registrado cobros para este préstamo.</p>
            ) : (
              <div className="space-y-2">
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

        </div>

      </div>
    </div>
  )
}