import React from 'react';
import { Sparkles, Clock, Award, Shield, Star, CheckCircle } from 'lucide-react';

interface HeroProps {
  onStartBooking: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onStartBooking }) => {
  return (
    <div className="relative overflow-hidden border-b border-zinc-800/80 bg-gradient-to-b from-zinc-900/50 via-zinc-950 to-zinc-950 py-12 md:py-16">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-amber-500/10 via-amber-700/5 to-transparent blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/90 border border-amber-500/30 text-amber-300 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Master Grooming & Relaxing Hair Therapy</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15]">
              Redefining Gentleman’s <br />
              <span className="gold-text-gradient">Style & Elegance</span>
            </h1>

            <p className="text-zinc-400 text-sm sm:text-base max-w-xl mx-auto lg:mx-0 font-light leading-relaxed">
              Experience handcrafted hair styling, meticulous beard architecture, and rejuvenation therapies delivered by certified salon masters in Colombo.
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
              <button
                onClick={onStartBooking}
                className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-zinc-950 font-semibold text-sm shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Book Your Session</span>
              </button>

              <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-300">
                <div className="flex -space-x-1.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <span className="font-medium text-white">4.95 / 5.0</span>
                <span className="text-zinc-500">· 850+ Happy Clients</span>
              </div>
            </div>

            {/* Highlights pill row */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-zinc-800/60 max-w-lg mx-auto lg:mx-0">
              <div className="text-left">
                <p className="text-amber-400 font-bold text-lg">No Queues</p>
                <p className="text-zinc-500 text-xs">Instant Slot Reservation</p>
              </div>
              <div className="text-left">
                <p className="text-amber-400 font-bold text-lg">100% Hygenic</p>
                <p className="text-zinc-500 text-xs">Sterilized Single-use Tools</p>
              </div>
              <div className="text-left">
                <p className="text-amber-400 font-bold text-lg">VIP Lounge</p>
                <p className="text-zinc-500 text-xs">Complimentary Brew & Wi-Fi</p>
              </div>
            </div>

          </div>

          {/* Hero Visual Card */}
          <div className="lg:col-span-5">
            <div className="relative mx-auto max-w-md rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900/40 shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80"
                alt="Didula Saloon Studio"
                className="w-full h-80 object-cover object-center filter brightness-90 contrast-105 hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent" />
              
              <div className="absolute bottom-4 left-4 right-4 p-4 rounded-xl bg-zinc-900/90 backdrop-blur-md border border-zinc-800/80 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Today's Promotion</p>
                  <p className="text-sm font-medium text-white">Haircut + Beard Sculpt Combo</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-zinc-400 line-through">Rs. 4,300</span>
                  <p className="text-sm font-bold text-emerald-400">Rs. 3,800</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
