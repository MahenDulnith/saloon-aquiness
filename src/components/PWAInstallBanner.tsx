import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, CheckCircle } from 'lucide-react';

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    // Detect beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Detect if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert("To install this App:\n\n• On iPhone/iPad (Safari): Tap the Share button below and select 'Add to Home Screen'.\n• On Android (Chrome): Tap the menu (three dots) and tap 'Install App' or 'Add to Home screen'.");
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled || !isVisible) {
    return null;
  }

  return (
    <aside aria-label="Install App" className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 p-4 rounded-2xl bg-zinc-900/95 backdrop-blur-md border border-amber-500/40 shadow-2xl shadow-black/80 flex items-center justify-between gap-3 animate-bounce-short">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-zinc-950 font-bold shrink-0">
          <Smartphone className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-bold text-white">Install Saloon Aquiness App</p>
          <p className="text-[11px] text-zinc-400">Add to your phone for instant offline bookings.</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleInstallClick}
          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition-colors flex items-center gap-1 shadow-sm shadow-amber-500/20"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install</span>
        </button>
        <button
          onClick={() => setIsVisible(false)}
          className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
