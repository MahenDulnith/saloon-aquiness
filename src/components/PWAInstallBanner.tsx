import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, Smartphone, Check, ArrowDown } from 'lucide-react';

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIosDevice, setIsIosDevice] = useState<boolean>(false);
  const [showIosGuide, setShowIosGuide] = useState<boolean>(false);

  useEffect(() => {
    // Check if already in standalone PWA mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Check if user dismissed recently
    const dismissedAt = localStorage.getItem('aquiness_install_dismissed');
    if (dismissedAt && Date.now() - parseInt(dismissedAt, 10) < 24 * 60 * 60 * 1000) {
      // dismissed in last 24h
      return;
    }

    // Detect iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIosDevice(ios);

    if (ios) {
      // Delay slightly for smooth appearance
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2000);
      return () => clearTimeout(timer);
    }

    // For Android / Chrome / Edge
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (isIosDevice || !deferredPrompt) {
      // Show visual iOS guide modal
      setShowIosGuide(true);
      return;
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setIsVisible(false);
      }
      setDeferredPrompt(null);
    } catch {
      setShowIosGuide(true);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('aquiness_install_dismissed', Date.now().toString());
  };

  if (isInstalled || !isVisible) {
    return (
      <>
        {showIosGuide && (
          <IosInstallModal onClose={() => setShowIosGuide(false)} />
        )}
      </>
    );
  }

  return (
    <>
      <aside
        aria-label="Install App"
        className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-50 p-3.5 rounded-2xl bg-zinc-900/95 backdrop-blur-xl border border-amber-500/40 shadow-2xl shadow-black/80 flex items-center justify-between gap-3 animate-fade-in"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className="absolute -inset-1 rounded-full blur-md opacity-85 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 pointer-events-none" />
            <img
              src="/logo.png"
              alt="Aquiness Barber"
              className="relative w-11 h-11 rounded-full object-cover ring-2 ring-amber-500 shadow-xl shadow-amber-500/40 shrink-0"
            />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">Install Aquiness App</p>
            <p className="text-[11px] text-zinc-400 truncate">
              {isIosDevice ? 'Add to iPhone Home Screen' : 'Fast 1-tap booking on your home screen'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleInstallClick}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-zinc-950 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-amber-500/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install</span>
          </button>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {showIosGuide && (
        <IosInstallModal onClose={() => setShowIosGuide(false)} />
      )}
    </>
  );
};

export const IosInstallModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl p-5 shadow-2xl border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3.5 mb-4">
          <div className="relative shrink-0">
            <div className="absolute -inset-1.5 rounded-full blur-md opacity-85 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 pointer-events-none" />
            <img
              src="/logo.png"
              alt="Aquiness Barber"
              className="relative w-12 h-12 rounded-full object-cover ring-2 ring-amber-500 shadow-xl shadow-amber-500/50 shrink-0"
            />
          </div>
          <div>
            <h3 className="font-bold text-base leading-tight">Install on iPhone</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Add to your Home Screen in 3 steps</p>
          </div>
        </div>

        <div className="space-y-3 my-4 text-xs">
          <div className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-700/50">
            <div className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-500 font-bold flex items-center justify-center shrink-0">
              1
            </div>
            <div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                Tap the <span className="inline-flex items-center gap-1 font-bold text-blue-500"><Share className="w-3.5 h-3.5" /> Share</span> button
              </p>
              <p className="text-zinc-500 dark:text-zinc-400 mt-0.5">
                Located in the Safari toolbar at the bottom of your iPhone screen.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-700/50">
            <div className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-500 font-bold flex items-center justify-center shrink-0">
              2
            </div>
            <div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                Select <span className="inline-flex items-center gap-1 font-bold text-zinc-900 dark:text-zinc-100"><PlusSquare className="w-3.5 h-3.5 text-zinc-400" /> Add to Home Screen</span>
              </p>
              <p className="text-zinc-500 dark:text-zinc-400 mt-0.5">
                Scroll down the list of actions until you see the plus icon.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-700/50">
            <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500 font-bold flex items-center justify-center shrink-0">
              3
            </div>
            <div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                Tap <span className="font-bold text-blue-500">Add</span> at top right
              </p>
              <p className="text-zinc-500 dark:text-zinc-400 mt-0.5">
                The Aquiness app icon will appear right on your home screen!
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-all shadow-md active:scale-98"
        >
          Got it
        </button>

        <div className="flex items-center justify-center gap-1 text-[11px] text-zinc-400 mt-3">
          <ArrowDown className="w-3.5 h-3.5 animate-bounce text-blue-500" />
          <span>Tap the Share icon below</span>
        </div>
      </div>
    </div>
  );
};
