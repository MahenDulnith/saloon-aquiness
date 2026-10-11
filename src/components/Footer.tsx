import React from 'react';
import { Scissors, MapPin, Phone, Mail, Clock, Instagram, Facebook, Lock } from 'lucide-react';

interface FooterProps {
  onOpenStaffPortal?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenStaffPortal }) => {
  return (
    <footer className="bg-zinc-950 border-t border-zinc-800/80 text-zinc-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <img 
                src="/logo.png" 
                alt="Aquiness Barber Logo" 
                className="w-11 h-11 rounded-full object-cover ring-2 ring-amber-500/40" 
              />
              <div>
                <span className="font-serif text-lg font-bold text-white tracking-wide block">AQUINESS BARBER</span>
                <span className="text-[10px] uppercase font-semibold text-amber-400 tracking-wider">Professional Saloon · Est. 2024</span>
              </div>
            </div>
            <p className="text-zinc-500 leading-relaxed">
              Premier men's barber & professional salon in Pallewela. Master precision cuts, royal hot-towel shaves, and grooming therapies.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-white uppercase tracking-wider text-xs mb-3">Salon Location</h4>
            <div className="space-y-2">
              <p className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>Kuliyapitiya Madampe Road, Pallewela</span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                <a href="tel:+94701333485" className="hover:text-amber-400 transition-colors">070 133 3485</a>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                <span>info@aquinessbarber.lk</span>
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
            <h4 className="font-bold text-white uppercase tracking-wider text-xs mb-3">Appointments & Inquiries</h4>
            <p className="text-zinc-500 mb-3 leading-relaxed">
              Book appointments in seconds, choose your preferred stylist, and get instant updates.
            </p>
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400">
              <span className="text-emerald-400 font-semibold">● Salon Open Today:</span> Walk-ins & scheduled appointments welcome.
            </div>
          </div>

        </div>

        <div className="mt-12 pt-6 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-zinc-500 text-[11px]">
          <div className="flex items-center gap-3">
            <span>© {new Date().getFullYear()} Saloon Aquiness & Spa. All rights reserved.</span>
            {onOpenStaffPortal && (
              <>
                <span className="text-zinc-800">•</span>
                <button
                  onClick={onOpenStaffPortal}
                  className="text-zinc-600 hover:text-amber-400 transition-colors flex items-center gap-1"
                >
                  <Lock className="w-3 h-3" />
                  <span>Staff Portal</span>
                </button>
              </>
            )}
          </div>
          <p className="flex items-center gap-1">
            Built with modern Progressive Web App (PWA) architecture for iOS, Android & Desktop.
          </p>
        </div>
      </div>
    </footer>
  );
};
