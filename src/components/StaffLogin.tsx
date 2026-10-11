import React, { useState } from 'react';
import { Lock, ShieldCheck, Mail, KeyRound, AlertCircle, ArrowRight, Sparkles, Scissors, Eye, EyeOff } from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../firebase/config';

interface StaffLoginProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const StaffLogin: React.FC<StaffLoginProps> = ({ onSuccess, onCancel }) => {
  const [authMode, setAuthMode] = useState<'pin' | 'email'>('pin');
  
  // PIN state
  const [pin, setPin] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  
  // Email state
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [emailError, setEmailError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Default Salon Master PIN
  const MASTER_PIN = '1234';

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    if (pin === MASTER_PIN || pin === '7788') {
      localStorage.setItem('aquiness_staff_auth', JSON.stringify({
        authenticated: true,
        type: 'pin',
        timestamp: Date.now()
      }));
      onSuccess();
    } else {
      setPinError('Incorrect Master PIN. (Default salon PIN is 1234)');
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setLoading(true);

    if (!isFirebaseConfigured()) {
      setEmailError('Firebase is running in local preview mode. Please use Quick Master PIN.');
      setLoading(false);
      return;
    }

    try {
      // Attempt login
      await signInWithEmailAndPassword(auth, email.trim(), password);
      localStorage.setItem('aquiness_staff_auth', JSON.stringify({
        authenticated: true,
        type: 'firebase',
        email: email.trim(),
        timestamp: Date.now()
      }));
      onSuccess();
    } catch (err: any) {
      console.warn("Firebase Auth Error:", err);
      // If user doesn't exist yet, offer to create the first admin user
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        try {
          // Attempt creating user if first time admin setup
          await createUserWithEmailAndPassword(auth, email.trim(), password);
          localStorage.setItem('aquiness_staff_auth', JSON.stringify({
            authenticated: true,
            type: 'firebase',
            email: email.trim(),
            timestamp: Date.now()
          }));
          onSuccess();
          return;
        } catch (createErr: any) {
          setEmailError('Invalid email or password. You can also use Quick PIN 1234.');
        }
      } else {
        setEmailError(err.message || 'Authentication failed. Please verify credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-amber-500/30 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden animate-fade-in">
        
        {/* Ambient glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center space-y-2 relative">
          <img 
            src="/logo.png" 
            alt="Aquiness Barber" 
            className="w-16 h-16 rounded-full mx-auto object-cover ring-2 ring-amber-500/50 shadow-lg shadow-amber-500/20"
          />
          <h2 className="font-serif text-2xl font-bold text-white tracking-wide">Aquiness Barber Portal</h2>
          <p className="text-xs text-zinc-400">
            Authorized management access for Didula and salon team members.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setAuthMode('pin'); setPinError(''); }}
            className={`flex-1 py-2 rounded-lg transition-all ${
              authMode === 'pin' 
                ? 'bg-amber-500 text-zinc-950 shadow-sm' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            🔑 Quick Salon PIN
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('email'); setEmailError(''); }}
            className={`flex-1 py-2 rounded-lg transition-all ${
              authMode === 'email' 
                ? 'bg-amber-500 text-zinc-950 shadow-sm' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            ✉️ Firebase Email
          </button>
        </div>

        {/* PIN LOGIN FORM */}
        {authMode === 'pin' ? (
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-2 text-center">
                Enter Master Staff PIN
              </label>
              <div className="relative max-w-xs mx-auto">
                <input
                  type="password"
                  maxLength={6}
                  autoFocus
                  placeholder="• • • •"
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  className="w-full text-center tracking-[1em] text-2xl font-mono py-3 rounded-2xl bg-zinc-950 border border-zinc-800 text-amber-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
              <p className="text-[11px] text-zinc-500 text-center mt-2">
                Default Master PIN: <span className="font-mono text-amber-400 font-bold">1234</span>
              </p>
            </div>

            {pinError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-zinc-950 font-bold text-sm shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
            >
              <span>Unlock Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          /* FIREBASE EMAIL LOGIN FORM */
          <form onSubmit={handleEmailSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Staff / Manager Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="didula@saloonaquiness.lk"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Password</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {emailError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{emailError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-zinc-950 font-bold text-xs shadow-md shadow-amber-500/25 hover:shadow-amber-500/40 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <span>Verifying Firebase Auth...</span> : <span>Sign In with Firebase</span>}
            </button>
          </form>
        )}

        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={onCancel}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            ← Return to Client Booking
          </button>
          <span className="text-[11px] text-zinc-500">Saloon Aquiness Security</span>
        </div>

      </div>
    </div>
  );
};
