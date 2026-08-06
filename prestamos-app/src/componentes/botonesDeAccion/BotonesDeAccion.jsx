import React from "react";
import { Landmark, UserPlus, Users, HandCoins, ReceiptText, Briefcase } from "lucide-react";
import FiltroProvincia from "../barraSuperior/FiltroPorProvincia";


export default function BotonesDeAccion({ 
  onOpenModal, 
  onOpenClientes, 
  onOpenInversionistas, 
  provinciaSeleccionada, 
  setProvinciaSeleccionada, 
  provincias = []  }) 
  {

  return (
        <div> 
<div className="mt-5 flex flex-wrap justify-center items-center gap-2.5">
       

        {/* Botón Buscar / Perfiles de Clientes */}
        <button
          onClick={onOpenClientes}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#0d6b63] border border-[#0d6b63]/20 text-[#fcfcfc] font-bold text-xs hover:bg-[#0d6b63]/20 transition-all shadow-xs cursor-pointer"
        >
          <Users className="w-4 h-4 text-[#f9f9f9]" />
          <span>Ver Clientes</span>
        </button>

        {/* Botón Buscar / Perfiles de Inversionistas */}
        <button
          onClick={onOpenInversionistas}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#0d6b63] border border-[#0d6b63]/20 text-[#fcfcfc] font-bold text-xs hover:bg-[#0d6b63]/20 transition-all shadow-xs cursor-pointer"
        >
          <Briefcase className="w-4 h-4 text-[#f9f9f9]" />
          <span>Ver Inversionistas</span>
        </button>

      </div>

    <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
             {/* Agregar Inversor */}
             <button 
               onClick={() => onOpenModal && onOpenModal('inversionista')}
               className="flex items-center border border-[#0d6b63]/20 gap-2 bg-[#0d6b63]/10 text-[#0d6b63] px-3.5 py-2.5 rounded-xl shadow-sm hover:bg-[#0d6b63]/20 transition-colors duration-200 font-medium text-xs sm:text-sm"
             >
               <UserPlus className="w-4 h-4" />
               <span>Agregar inversor</span>
             </button>
     
             {/* Agregar Cliente */}
             <button 
               onClick={() => onOpenModal && onOpenModal('cliente')}
               className="flex items-center border border-[#0d6b63]/20 gap-2 bg-[#0d6b63]/10 text-[#0d6b63] px-3.5 py-2.5 rounded-xl shadow-sm hover:bg-[#0d6b63]/20 transition-colors duration-200 font-medium text-xs sm:text-sm"
             >
               <Users className="w-4 h-4" />
               <span>Agregar cliente</span>
             </button>
     
             {/* Agregar Préstamo */}
             <button 
               onClick={() => onOpenModal && onOpenModal('opcionPrestamo')}
               className="flex items-center border border-[#0d6b63]/20 gap-2 bg-[#0d6b63]/10 text-[#0d6b63] px-3.5 py-2.5 rounded-xl shadow-sm hover:bg-[#0d6b63]/20 transition-colors duration-200 font-medium text-xs sm:text-sm"
             >
               <HandCoins className="w-4 h-4" />
               <span>Agregar opcion de préstamo</span>
             </button>
     
             {/* Agregar Cobro/Pago */}
             <button 
               onClick={() => onOpenModal && onOpenModal('pago')}
               className="flex items-center border border-[#0d6b63]/20 gap-2 bg-[#0d6b63]/10 text-[#0d6b63] px-3.5 py-2.5 rounded-xl shadow-sm hover:bg-[#0d6b63]/20 transition-colors duration-200 font-medium text-xs sm:text-sm"
             >
               <ReceiptText className="w-4 h-4" />
               <span>Agregar cobro/pago</span>
             </button>
     
             <button 
               onClick={() => onOpenModal && onOpenModal('prestamo')}
               className="flex items-center border border-[#0d6b63]/20 gap-2 bg-[#0d6b63]/10 text-[#0d6b63] px-3.5 py-2.5 rounded-xl shadow-sm hover:bg-[#0d6b63]/20 transition-colors duration-200 font-medium text-xs sm:text-sm"
             >
               <ReceiptText className="w-4 h-4" />
               <span>Agregar prestamo</span>
             </button>
           </div>
           </div>

  );
};