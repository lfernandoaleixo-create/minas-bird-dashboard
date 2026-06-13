/**
 * LandingPage — Minas Bird
 * Full-screen hero with the Eclectus bird photo as background
 * Photo shown in full (no cropping), centered, with brand overlay
 */
import { useLocation } from "wouter";
import { ArrowRight } from "lucide-react";

const MB_SYMBOL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663487476806/GbyPqTQ4WPAeZLRC6VPuta/mb-symbol_eba1d647.png";
const BIRD_PHOTO = "/manus-storage/bird-eclectus-red_ff8b9180.jpeg";

export default function LandingPage() {
  const [, navigate] = useLocation();

  const enterDashboard = () => {
    navigate("/dashboard");
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* Background photo — fills the entire screen */}
      <img
        src={BIRD_PHOTO}
        alt="Eclectus"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Dark overlay on the sides/edges for contrast with text */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-black/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30" />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-between px-6 sm:px-10 lg:px-16 py-8 sm:py-12">
        {/* Top — Logo */}
        <div className="flex items-center gap-4">
          <img
            src={MB_SYMBOL}
            alt="Minas Bird"
            className="h-14 sm:h-18 w-auto object-contain drop-shadow-2xl"
          />
          <div>
            <h1 className="text-white font-bold text-2xl sm:text-3xl lg:text-4xl tracking-[0.12em] drop-shadow-lg">
              MINAS BIRD
            </h1>
            <p className="text-white/50 text-[10px] sm:text-xs tracking-[0.2em] font-light mt-0.5">
              CRIATÓRIO CONSERVACIONISTA
            </p>
          </div>
        </div>

        {/* Center — Main text */}
        <div className="flex-1 flex items-center">
          <div className="max-w-xl">
            <p className="text-emerald-300/80 text-xs sm:text-sm font-semibold tracking-[0.15em] uppercase mb-3">
              Manual Operacional
            </p>
            <h2 className="text-white text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight drop-shadow-lg">
              Gestão Completa
              <br />
              <span className="text-emerald-200">do Plantel</span>
            </h2>
            <p className="text-white/60 text-sm sm:text-base mt-4 max-w-md leading-relaxed">
              Alimentação, manejo, reprodução, documentação e controle financeiro — tudo em um só lugar.
            </p>

            {/* CTA Button */}
            <button
              onClick={enterDashboard}
              className="mt-8 group flex items-center gap-3 px-7 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-900/30 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-900/40 hover:translate-y-[-1px]"
            >
              Acessar Painel
              <ArrowRight
                size={18}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </button>
          </div>
        </div>

        {/* Bottom — Footer */}
        <div className="flex items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-[1px] bg-white/30" />
            <p className="text-white/40 text-xs sm:text-sm font-light tracking-wide">
              Ribeirão Vermelho — MG
            </p>
          </div>
        </div>
      </div>

      {/* Subtle vignette */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_120px_rgba(0,0,0,0.4)]" />
    </div>
  );
}
