import React from "react";
import { Landmark, UserPlus, Users, HandCoins, ReceiptText } from "lucide-react";
import FiltroProvincia from "./filtroPorProvincia";

export default function BarraSuperior({ onOpenModal, provinciaSeleccionada, setProvinciaSeleccionada, provincias = [] }) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 md:px-12 ">
      {/* LADO IZQUIERDO: Ícono + Títulos */}
      <div className="mt-5 flex items-center gap-3.5">
        <div className=" w-12 h-12 rounded-2xl bg-[#0d6b63] text-white flex items-center justify-center shrink-0 shadow-sm">
          <Landmark className="w-6 h-6" />
        </div>

        <div>
          <h2 className="text-xs font-bold font-sans tracking-[0.18em] uppercase text-[#0d6b63]">
            GESTIÓN MULTIPLATAFORMA
          </h2>
          <h1 className="text-3xl sm:text-4xl font-bold font-serif text-[#1d2939] leading-none mt-1">
            Panel de Control
          </h1>
        </div>
      </div>

      {/* LADO DERECHO: Botones de Acción */}
      <div className="mt-5 flex flex-wrap items-center gap-2.5">

        {/* Filtro por Provincia */}
        <FiltroProvincia 
          provinciaSeleccionada={provinciaSeleccionada} 
          setProvinciaSeleccionada={setProvinciaSeleccionada} 
          provincias={provincias} 
        />

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
          onClick={() => onOpenModal && onOpenModal('prestamo')}
          className="flex items-center gap-2 bg-[#0d6b63] text-white px-3.5 py-2.5 rounded-xl shadow-sm hover:bg-[#0b5a52] transition-colors duration-200 font-medium text-xs sm:text-sm"
        >
          <HandCoins className="w-4 h-4" />
          <span>Agregar préstamo</span>
        </button>

        {/* Agregar Cobro/Pago */}
        <button 
          onClick={() => onOpenModal && onOpenModal('pago')}
          className="flex items-center gap-2 bg-[#0d6b63] text-white px-3.5 py-2.5 rounded-xl shadow-sm hover:bg-[#0b5a52] transition-colors duration-200 font-medium text-xs sm:text-sm"
        >
          <ReceiptText className="w-4 h-4" />
          <span>Agregar cobro/pago</span>
        </button>
      </div>
    </div>
  );
}