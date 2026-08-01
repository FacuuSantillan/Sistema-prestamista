import React, { useState } from 'react'
import BarraSuperior from './componentes/barraSuperior/BarraSuperior'
import ModalInversionista from './componentes/ModalesBotones/modalInversionista'
import ModalCliente from './componentes/ModalesBotones/modalClientes'

export default function App() {
  // Guarda el tipo de modal abierto: 'inversionista', 'cliente' o null
  const [modalActivo, setModalActivo] = useState(null)

  const handleRefreshData = () => {
    console.log('Registro creado con éxito. Recargando datos...')
  }

  return (
    <div className="min-h-screen bg-paper">
      <BarraSuperior onOpenModal={(tipo) => setModalActivo(tipo)} />

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
    </div>
  )
}