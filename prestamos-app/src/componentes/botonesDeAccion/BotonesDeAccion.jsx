import React from "react";
import { Landmark, UserPlus, Users, HandCoins, ReceiptText } from "lucide-react";

export default function BotonesDeAccion({ onOpenModal }) {

  return (
    <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
     
             {/* Agregar Inversor */}
             <button 
               onClick={() => onOpenModal && onOpenModal('inversionista')}
               className="flex items-center gap-2 bg-[#0d6b63] text-white px-3.5 py-2.5 rounded-xl shadow-sm hover:bg-[#0b5a52] transition-colors duration-200 font-medium text-xs sm:text-sm"
             >
               <UserPlus className="w-4 h-4" />
               <span>Agregar inversor</span>
             </button>
     
             {/* Agregar Cliente */}
             <button 
               onClick={() => onOpenModal && onOpenModal('cliente')}
               className="flex items-center gap-2 bg-[#0d6b63] text-white px-3.5 py-2.5 rounded-xl shadow-sm hover:bg-[#0b5a52] transition-colors duration-200 font-medium text-xs sm:text-sm"
             >
               <Users className="w-4 h-4" />
               <span>Agregar cliente</span>
             </button>
     
             {/* Agregar Préstamo */}
             <button 
               onClick={() => onOpenModal && onOpenModal('opcionPrestamo')}
               className="flex items-center gap-2 bg-[#0d6b63] text-white px-3.5 py-2.5 rounded-xl shadow-sm hover:bg-[#0b5a52] transition-colors duration-200 font-medium text-xs sm:text-sm"
             >
               <HandCoins className="w-4 h-4" />
               <span>Agregar opcion de préstamo</span>
             </button>
     
             {/* Agregar Cobro/Pago */}
             <button 
               onClick={() => onOpenModal && onOpenModal('pago')}
               className="flex items-center gap-2 bg-[#0d6b63] text-white px-3.5 py-2.5 rounded-xl shadow-sm hover:bg-[#0b5a52] transition-colors duration-200 font-medium text-xs sm:text-sm"
             >
               <ReceiptText className="w-4 h-4" />
               <span>Agregar cobro/pago</span>
             </button>
     
             <button 
               onClick={() => onOpenModal && onOpenModal('prestamo')}
               className="flex items-center gap-2 bg-[#0d6b63] text-white px-3.5 py-2.5 rounded-xl shadow-sm hover:bg-[#0b5a52] transition-colors duration-200 font-medium text-xs sm:text-sm"
             >
               <ReceiptText className="w-4 h-4" />
               <span>Agregar prestamo</span>
             </button>
           </div>

  );
};