import React from "react";
import { Landmark, Users, Briefcase } from "lucide-react";
import FiltroProvincia from "./FiltroPorProvincia";

export default function BarraSuperior({ 

 
}) {
  return (
    <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-6 md:px-12 pb-4 after:absolute after:bottom-0 after:left-6 after:right-6 md:after:left-12 md:after:right-12 after:h-[2px] after:bg-gradient-to-r after:from-transparent after:via-[#0d6b63] after:to-transparent">     
      
      {/* LADO IZQUIERDO: Título e Ícono */}
      <div className="mt-5 flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-[#0d6b63] text-white flex items-center justify-center shrink-0 shadow-sm">
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
    </div>
  );
}