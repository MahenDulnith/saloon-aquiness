import React from 'react';
import { Scissors, Calendar, Phone, Sparkles, ArrowLeft } from 'lucide-react';

interface NavbarProps {
  currentView: 'booking' | 'admin';
  onViewChange: (view: 'booking' | 'admin') => void;
  onBookNowClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onViewChange, onBookNowClick }) => {
  return (
    <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 app-header-safe-top">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-2 sm:h-20">
          
          {/* Logo & Brand */}
          <div 
            onClick={() => onViewChange('booking')}
            className="flex items-center gap-3.5 cursor-pointer group"
          >
            <img 
              src="/logo.png" 
              alt="Aquiness Barber Logo" 
              className="w-12 h-12 rounded-full object-cover shadow-lg shadow-amber-500/20 ring-2 ring-amber-500/40 group-hover:scale-105 transition-transform duration-200" 
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-white group-hover:text-amber-400 transition-colors">
                  AQUINESS BARBER
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 hidden sm:inline-block">
                  Professional Saloon
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-light flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Pallewela · Open Today: 9:00 AM – 8:00 PM
              </p>
            </div>
          </div>

          {/* Customer Navigation Links (Desktop) */}
          {currentView === 'booking' && (
            <nav className="hidden md:flex items-center gap-6 text-xs uppercase tracking-wider font-medium text-zinc-300">
              <button 
                onClick={onBookNowClick}
                className="hover:text-amber-400 transition-colors"
              >
                Services
              </button>
              <button 
                onClick={onBookNowClick}
                className="hover:text-amber-400 transition-colors"
              >
                Specialists
              </button>
              <a 
                href="#footer"
                onClick={(e) => {
                  e.preventDefault();
                  document.querySelector('footer')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="hover:text-amber-400 transition-colors"
              >
                Hours & Location
              </a>
            </nav>
          )}

          {/* Right Action Area */}
          <div className="flex items-center gap-2 sm:gap-4">
            {currentView === 'booking' ? (
              <>
                <a 
                  href="tel:+94701333485" 
                  className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-amber-400" />
                  <span>070 133 3485</span>
                </a>

                {/* Primary Gold Booking CTA Button */}
                <button
                  onClick={onBookNowClick}
                  className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-zinc-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/20 hover:shadow-amber-500/35 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Book Appointment</span>
                </button>
              </>
            ) : (
              /* If currently in Staff Portal, show Return to Website button */
              <button
                onClick={() => onViewChange('booking')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
                <span>Return to Client Website</span>
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
