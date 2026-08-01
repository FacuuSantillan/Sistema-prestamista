import React, { useState } from 'react'
import BarraSuperior from './componentes/barraSuperior/BarraSuperior'
import ModalInversionista from './componentes/botonesDeAccion/ModalesBotones/modalInversionista'
import ModalCliente from './componentes/botonesDeAccion/ModalesBotones/modalClientes'
import ModalAgregarOpcionPrestamo from './componentes/botonesDeAccion/ModalesBotones/ModalAgregarOpcionPrestamo'
import ModalAgregarPrestamo from "./componentes/botonesDeAccion/ModalesBotones/ModalAgregarPrestamo"
import ModalPago from './componentes/botonesDeAccion/ModalesBotones/ModalAgregarPago'
import BotonesDeAccion from './componentes/botonesDeAccion/BotonesDeAccion'

export default function App() {
  // Guarda el tipo de modal abierto: 'inversionista', 'cliente' o null
  const [modalActivo, setModalActivo] = useState(null)

  const handleRefreshData = () => {
    console.log('Registro creado con éxito. Recargando datos...')
  }

  return (
    <div className="min-h-screen bg-paper">

      <BarraSuperior  />
      <BotonesDeAccion onOpenModal={(tipo) => setModalActivo(tipo)}/>

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

    </div>
  )
}