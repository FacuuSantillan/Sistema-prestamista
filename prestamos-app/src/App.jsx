import React, { useState } from 'react'
import BarraSuperior from './componentes/barraSuperior/barraSuperior'
import ModalInversionista from './componentes/ModalInversionista'

export default function App() {
  const [modalInversionistaOpen, setModalInversionistaOpen] = useState(false)

  const handleOpenModal = (tipo) => {
    if (tipo === 'inversionista') {
      setModalInversionistaOpen(true)
    }
  }

  const handleRefreshData = () => {
    // Acá podés volver a cargar las métricas o la lista de registros recientes
    console.log('Inversor creado con éxito. Recargando datos...')
  }

  return (
    <div className="min-h-screen bg-paper">
      <BarraSuperior onOpenModal={handleOpenModal} />

      <ModalInversionista
        isOpen={modalInversionistaOpen}
        onClose={() => setModalInversionistaOpen(false)}
        onSuccess={handleRefreshData}
      />
    </div>
  )
}