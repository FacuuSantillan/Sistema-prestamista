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

export default function App() {
  // Guarda el préstamo a mostrar en la ficha técnica
  const [prestamoFicha, setPrestamoFicha] = useState(null)
  const [modalActivo, setModalActivo] = useState(null)
  
  // Guarda la pestaña inicial del directorio: 'clientes' o 'inversionistas'
  const [tipoDirectorio, setTipoDirectorio] = useState('clientes')

  const handleRefreshData = () => {
    console.log('Registro creado con éxito. Recargando datos...')
  }

  const [modalFichaAbierta, setModalFichaAbierta] = useState(false)

  // Función para abrir la ficha técnica
  const handleAbrirFichaPrestamo = (prestamo) => {
    setPrestamoFicha(prestamo)
    setModalFichaAbierta(true)
  }

  // Funciones para abrir el directorio en la pestaña deseada
  const handleOpenDirectorioClientes = () => {
    setTipoDirectorio('clientes')
    setModalActivo('directorio')
  }

  const handleOpenDirectorioInversionistas = () => {
    setTipoDirectorio('inversionistas')
    setModalActivo('directorio')
  }

  return (
    <div className="min-h-screen bg-paper">

      {/* 1. Pasamos los handlers a BarraSuperior */}
      <BarraSuperior 
        onOpenClientes={handleOpenDirectorioClientes}
        onOpenInversionistas={handleOpenDirectorioInversionistas}
      />

      <BotonesDeAccion onOpenModal={(tipo) => setModalActivo(tipo)}/>

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

      {/* 2. Modal de Directorio (Clientes / Inversionistas) */}
      <ModalDirectorio
        isOpen={modalActivo === 'directorio'}
        tipoInicial={tipoDirectorio}
        onClose={() => setModalActivo(null)}
        onVerFichaPrestamo={handleAbrirFichaPrestamo} // 👈 Conexión directa fijada
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

    </div>
  )
}