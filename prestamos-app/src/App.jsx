import React, { useState, useEffect } from 'react'
import { LogOut, UserCheck } from 'lucide-react'
import { supabase } from './lib/supabaseClient'

// Autenticación
import Login from './componentes/auth/Login'

// Componentes del Dashboard
import BarraSuperior from './componentes/barraSuperior/BarraSuperior'
import ModalInversionista from './componentes/botonesDeAccion/ModalesBotones/modalInversionista'
import ModalCliente from './componentes/botonesDeAccion/ModalesBotones/modalClientes'
import ModalAgregarOpcionPrestamo from './componentes/botonesDeAccion/ModalesBotones/ModalAgregarOpcionPrestamo'
import ModalAgregarPrestamo from "./componentes/botonesDeAccion/ModalesBotones/ModalAgregarPrestamo"
import ModalPago from './componentes/botonesDeAccion/ModalesBotones/ModalAgregarPago'
import ModalDirectorio from "./componentes/barraSuperior/ModalDirectorio"
import BotonesDeAccion from './componentes/botonesDeAccion/BotonesDeAccion'
import ModalFichaPrestamo from './componentes/botonesDeAccion/ModalesBotones/ModalFichaPrestamo'
import PanoramaEstadisticas from './componentes/panoramaEstadisticas/PanoramaEstadisticas'
import RegistrosRecientes from './componentes/Registros/RegistrosRecientes'
import GraficoEstadistico from './componentes/panoramaEstadisticas/GraficoEstadistico'

export default function App() {
  // Estado de Autenticación
  const [usuario, setUsuario] = useState(null)
  const [checkingAuth, setCheckingAuth] = useState(true)

  // Guarda el préstamo a mostrar en la ficha técnica
  const [prestamoFicha, setPrestamoFicha] = useState(null)
  const [modalActivo, setModalActivo] = useState(null)
  
  // Guarda la pestaña inicial del directorio: 'clientes' o 'inversionistas'
  const [tipoDirectorio, setTipoDirectorio] = useState('clientes')

  // Guarda el ID específico del perfil (cliente o inversionista) a seleccionar al abrir el directorio
  const [perfilSeleccionadoId, setPerfilSeleccionadoId] = useState(null)

  const [modalFichaAbierta, setModalFichaAbierta] = useState(false)

  // --- VERIFICACIÓN DE SESIÓN CON SUPABASE ---
  useEffect(() => {
    async function checkSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user) {
          const { data: profile } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle()

          setUsuario({
            ...session.user,
            rol: profile?.rol || (session.user.email?.includes('admin') ? 'admin' : 'inversionista'),
            nombre: profile?.nombre_completo || profile?.nombre || session.user.email
          })
        }
      } catch (err) {
        console.error('Error al verificar sesión:', err)
      } finally {
        setCheckingAuth(false)
      }
    }

    checkSession()

    // Suscripción a cambios en la autenticación (login / logout)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle()

        setUsuario({
          ...session.user,
          rol: profile?.rol || (session.user.email?.includes('admin') ? 'admin' : 'inversionista'),
          nombre: profile?.nombre_completo || profile?.nombre || session.user.email
        })
      } else {
        setUsuario(null)
      }
      setCheckingAuth(false)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUsuario(null)
  }

  const handleRefreshData = () => {
    console.log('Registro creado con éxito. Recargando datos...')
  }

  // Función para abrir la ficha técnica
  const handleAbrirFichaPrestamo = (prestamo) => {
    setPrestamoFicha(prestamo)
    setModalFichaAbierta(true)
  }

  // Funciones para abrir el directorio desde la barra superior o panoramas generales
  const handleOpenDirectorioClientes = () => {
    setTipoDirectorio('clientes')
    setPerfilSeleccionadoId(null)
    setModalActivo('directorio')
  }

  const handleOpenDirectorioInversionistas = () => {
    setTipoDirectorio('inversionistas')
    setPerfilSeleccionadoId(null)
    setModalActivo('directorio')
  }

  // 1. PANTALLA DE CARGA INICIAL
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center text-xs font-bold text-slate-400 space-y-2">
        <div className="w-8 h-8 border-3 border-[#0d6b63] border-t-transparent rounded-full animate-spin" />
        <span>Verificando credenciales de acceso...</span>
      </div>
    )
  }

  // 2. SI NO HAY SESIÓN INICIADA -> MUESTRA EL LOGIN
  if (!usuario) {
    return <Login onLoginSuccess={(u) => setUsuario(u)} />
  }

  // 3. SI ESTÁ AUTENTICADO -> RENDERIZA EL PANEL COMPLETO
  const esAdmin = usuario.rol === 'admin'

  return (
    <div className="min-h-screen bg-paper pb-12">

      {/* BARRA DE ESTADO Y CONTROL DE SESIÓN */}
      <div className="w-[95%] mx-auto pt-3 flex items-center justify-between text-xs font-medium text-slate-600 border-b border-line/60 pb-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold text-slate-800">{usuario.nombre}</span>
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
            esAdmin ? 'bg-[#0d6b63]/10 text-[#0d6b63]' : 'bg-blue-100 text-blue-800'
          }`}>
            {esAdmin ? 'Administrador' : 'Inversionista'}
          </span>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-line text-slate-600 hover:text-red-600 hover:border-red-200 transition-all cursor-pointer font-bold shadow-2xs"
          title="Cerrar sesión activa"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Cerrar Sesión</span>
        </button>
      </div>

      {/* Barra Superior */}
      <BarraSuperior />

      {/* Botones de Acción */}
      <BotonesDeAccion 
        onOpenModal={(tipo) => setModalActivo(tipo)}
        onOpenClientes={handleOpenDirectorioClientes}
        onOpenInversionistas={handleOpenDirectorioInversionistas}
      />

      {/* Modales de alta de registros */}
      <ModalInversionista
        isOpen={modalActivo === 'inversionista'}
        onClose={() => setModalActivo(null)}
        onSuccess={handleRefreshData}
      />

      <ModalCliente
        isOpen={modalActivo === 'cliente'}
        onClose={() => setModalActivo(null)}
        onSuccess={handleRefreshData}
      />

      <ModalAgregarOpcionPrestamo
        isOpen={modalActivo === 'opcionPrestamo'}
        onClose={() => setModalActivo(null)}
        onSuccess={handleRefreshData}
      />

      <ModalAgregarPrestamo
        isOpen={modalActivo === 'prestamo'}
        onClose={() => setModalActivo(null)}
        onSuccess={handleRefreshData}
      />

      <ModalPago
        isOpen={modalActivo === 'pago'}
        onClose={() => setModalActivo(null)}
        onSuccess={handleRefreshData}
      />

      {/* Modal de Directorio */}
      <ModalDirectorio
        isOpen={modalActivo === 'directorio'}
        tipoInicial={tipoDirectorio}
        itemInicialId={perfilSeleccionadoId}
        onClose={() => {
          setModalActivo(null)
          setPerfilSeleccionadoId(null)
        }}
        onVerFichaPrestamo={handleAbrirFichaPrestamo}
      />

      {/* Modal de Ficha Técnica del Préstamo */}
      <ModalFichaPrestamo
        isOpen={modalFichaAbierta}
        onClose={() => {
          setModalFichaAbierta(false)
          setPrestamoFicha(null)
        }}
        prestamo={prestamoFicha}
      />

      {/* Panorama Estadístico */}
      <PanoramaEstadisticas 
        onAbrirDirectorioInversionistas={handleOpenDirectorioInversionistas}
      />

      {/* Gráfico Estadístico de Barras */}
      <GraficoEstadistico />

      {/* Registros Recientes con captura de ID de perfil */}
      {/* <RegistrosRecientes 
        onVerFichaPrestamo={handleAbrirFichaPrestamo}
        onAbrirCliente={(cliente) => {
          setTipoDirectorio('clientes')
          setPerfilSeleccionadoId(cliente?.id || null)
          setModalActivo('directorio')
        }}
        onAbrirInversionista={(inversionista) => {
          setTipoDirectorio('inversionistas')
          setPerfilSeleccionadoId(inversionista?.id || null)
          setModalActivo('directorio')
        }}
      /> */}

    </div>
  )
}