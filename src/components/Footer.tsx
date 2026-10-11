import React from 'react';
import { Scissors, MapPin, Phone, Mail, Clock, Instagram, Facebook } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-zinc-950 border-t border-zinc-800/80 text-zinc-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-zinc-950 font-bold">
                <Scissors className="w-4 h-4 -rotate-45" />
              </div>
              <span className="font-serif text-lg font-bold text-white tracking-wide">SALOON AQUINESS</span>
            </div>
            <p className="text-zinc-500 leading-relaxed">
              Premium grooming studio and relaxation retreat in Colombo. Master precision cuts, royal shaves, and luxury hair spa.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-xs mb-3">Salon Location</h4>
            <div className="space-y-2">
              <p className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>45 Galle Road, Colombo 03, Sri Lanka</span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                <span>+94 77 123 4567</span>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                <span>appointments@saloonaquiness.lk</span>
              </p>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-xs mb-3">Working Hours</h4>
            <div className="space-y-1.5 text-zinc-400">
              <div className="flex justify-between">
                <span>Monday – Friday</span>
                <span className="text-white font-medium">9:00 AM – 8:30 PM</span>
              </div>
              <div className="flex justify-between">
                <span>Saturday</span>
                <span className="text-white font-medium">8:30 AM – 9:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span>Sunday</span>
                <span className="text-amber-400 font-medium">9:00 AM – 7:00 PM</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-xs mb-3">PWA & Booking Info</h4>
            <p className="text-zinc-500 mb-3 leading-relaxed">
              Fast, zero-download PWA web app powered by Firebase Cloud architecture.
            </p>
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400">
              <span className="text-emerald-400 font-semibold">● System Online:</span> Instant confirmation & automatic schedule synchronization.
            </div>
          </div>

        </div>

        <div className="mt-12 pt-6 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-zinc-500 text-[11px]">
          <p>© {new Date().getFullYear()} Saloon Aquiness & Spa. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Built with modern Progressive Web App (PWA) architecture for iOS, Android & Desktop.
          </p>
        </div>
      </div>
    </footer>
  );
};
