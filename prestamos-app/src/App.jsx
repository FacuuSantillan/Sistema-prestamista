import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import BarraSuperior from './componentes/barraSuperior/barraSuperior'

function App() {
  
  return (
    <div>
      <BarraSuperior />
    </div>
  )
}

export default App