/**
 * LandingPage — Minas Bird
 * Full-screen hero with rotating bird photos as background
 * Clean, cinematic feel with brand overlay and CTA to enter the dashboard
 */
import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

const MB_SYMBOL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663487476806/GbyPqTQ4WPAeZLRC6VPuta/mb-symbol_eba1d647.png";

const SLIDES = [
  {
    image: "/manus-storage/bird-eclectus-red_ff8b9180.jpeg",
    caption: "Eclectus · Fêmea",
  },
  {
    image: "/manus-storage/bird-eclectus-green_c45c9ca2.jpeg",
    caption: "Eclectus · Macho",
  },
  {
    image: "/manus-storage/bird-alexandrines_2e25d265.jpeg",
    caption: "Alexandrinos",
  },
];

export default function LandingPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [, navigate] = useLocation();

  const goToSlide = useCallback(
    (index: number) => {
      if (isTransitioning) return;
      setIsTransitioning(true);
      setCurrentSlide(index);
      setTimeout(() => setIsTransitioning(false), 1000);
    },
    [isTransitioning]
  );

  const nextSlide = useCallback(() => {
    goToSlide((currentSlide + 1) % SLIDES.length);
  }, [currentSlide, goToSlide]);

  const prevSlide = useCallback(() => {
    goToSlide((currentSlide - 1 + SLIDES.length) % SLIDES.length);
  }, [currentSlide, goToSlide]);

  // Auto-advance every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const enterDashboard = () => {
    navigate("/dashboard");
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* Background slides */}
      {SLIDES.map((slide, index) => (
        <div
          key={index}
          className="absolute inset-0 transition-opacity duration-[1500ms] ease-in-out"
          style={{ opacity: currentSlide === index ? 1 : 0 }}
        >
          <img
            src={slide.image}
            alt={slide.caption}
            className="w-full h-full object-cover"
            loading={index === 0 ? "eager" : "lazy"}
          />
        </div>
      ))}

      {/* Gradient overlays for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/40" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" />

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

        {/* Bottom — Slide controls + caption */}
        <div className="flex items-end justify-between">
          {/* Caption */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-[1px] bg-white/30" />
            <p className="text-white/50 text-xs sm:text-sm font-light tracking-wide">
              {SLIDES[currentSlide].caption}
            </p>
          </div>

          {/* Navigation controls */}
          <div className="flex items-center gap-3">
            {/* Dots */}
            <div className="flex items-center gap-2 mr-3">
              {SLIDES.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`transition-all duration-500 rounded-full ${
                    currentSlide === index
                      ? "w-6 h-2 bg-emerald-400"
                      : "w-2 h-2 bg-white/30 hover:bg-white/50"
                  }`}
                  aria-label={`Slide ${index + 1}`}
                />
              ))}
            </div>

            {/* Arrows */}
            <button
              onClick={prevSlide}
              className="p-2 rounded-full border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-all backdrop-blur-sm"
              aria-label="Anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={nextSlide}
              className="p-2 rounded-full border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-all backdrop-blur-sm"
              aria-label="Próximo"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Subtle vignette */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_120px_rgba(0,0,0,0.4)]" />
    </div>
  );
}
