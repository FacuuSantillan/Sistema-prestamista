import React, { useState } from 'react'
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
import GraficoEstadistico  from './componentes/panoramaEstadisticas/GraficoEstadistico'

export default function App() {
  // Guarda el préstamo a mostrar en la ficha técnica
  const [prestamoFicha, setPrestamoFicha] = useState(null)
  const [modalActivo, setModalActivo] = useState(null)
  
  // Guarda la pestaña inicial del directorio: 'clientes' o 'inversionistas'
  const [tipoDirectorio, setTipoDirectorio] = useState('clientes')

  // Guarda el ID específico del perfil (cliente o inversionista) a seleccionar al abrir el directorio
  const [perfilSeleccionadoId, setPerfilSeleccionadoId] = useState(null)

  const [modalFichaAbierta, setModalFichaAbierta] = useState(false)

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

  return (
    <div className="min-h-screen bg-paper pb-12">

      {/* 1. Pasamos los handlers a BarraSuperior */}
      <BarraSuperior 
        
      />

      <BotonesDeAccion onOpenModal={(tipo) => setModalActivo(tipo)}
        onOpenClientes={handleOpenDirectorioClientes}
        onOpenInversionistas={handleOpenDirectorioInversionistas}/>

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

      {/* 2. Modal de Directorio (Clientes / Inversionistas) con selección específica */}
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

      {/* 3. Modal de Ficha Técnica del Préstamo */}
      <ModalFichaPrestamo
        isOpen={modalFichaAbierta}
        onClose={() => {
          setModalFichaAbierta(false)
          setPrestamoFicha(null)
        }}
        prestamo={prestamoFicha}
      />

      {/* 4. Panorama Estadístico */}
      <PanoramaEstadisticas 
        onAbrirDirectorioInversionistas={handleOpenDirectorioInversionistas}
      />

      <GraficoEstadistico />

      {/* 5. Registros Recientes con captura de ID de perfil */}
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