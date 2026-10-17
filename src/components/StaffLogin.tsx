import React, { useState, useEffect } from 'react';
import { Delete, Mail, KeyRound, Eye, EyeOff, AlertCircle, Sun, Moon } from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../firebase/config';
import { CurrentStaffUser, StaffMember } from '../types';
import { INITIAL_STAFF } from '../data/mockData';

interface StaffLoginProps {
  onSuccess: (user: CurrentStaffUser) => void;
  onCancel: () => void;
  staffList?: StaffMember[];
}

export const StaffLogin: React.FC<StaffLoginProps> = ({ 
  onSuccess, 
  onCancel,
  staffList = INITIAL_STAFF
}) => {
  const [authMode, setAuthMode] = useState<'pin' | 'email'>('pin');

  // Theme state: 'light' or 'dark'
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('aquiness_staff_theme');
      return saved === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem('aquiness_staff_theme', next);
      } catch {
        // ignore
      }
      return next;
    });
  };

  const isDark = theme === 'dark';

  // Selected staff profile for PIN sign-in
  const [selectedStaffId, setSelectedStaffId] = useState<string>('staff-1'); // Default Didula

  // PIN state
  const [pin, setPin] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');

  // Email state
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [emailError, setEmailError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Active selected member
  const currentSelectedMember = staffList.find(s => s.id === selectedStaffId) || staffList[0] || {
    id: 'staff-1',
    name: 'Didula Perera',
    role: 'Founder & Master Stylist',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    specialty: 'Master Barber'
  };

  const isDidulaAdmin = currentSelectedMember.id === 'staff-1' || currentSelectedMember.name.toLowerCase().includes('didula');

  // Verify PIN logic
  const verifyPin = (pinToTest: string) => {
    const trimmed = pinToTest.trim();
    if (isDidulaAdmin) {
      if (trimmed === '1234' || trimmed === '7788') {
        const user: CurrentStaffUser = {
          id: currentSelectedMember.id,
          name: currentSelectedMember.name,
          role: 'admin',
          title: currentSelectedMember.role || 'Owner & Master Stylist',
          avatar: currentSelectedMember.avatar
        };

        localStorage.setItem('aquiness_staff_auth', JSON.stringify({
          authenticated: true,
          type: 'pin',
          user,
          timestamp: Date.now()
        }));

        onSuccess(user);
      } else {
        setPinError('Incorrect PIN. Try again.');
        setTimeout(() => {
          setPin('');
          setPinError('');
        }, 800);
      }
    } else {
      if (trimmed === '5678' || trimmed === '1234') {
        const user: CurrentStaffUser = {
          id: currentSelectedMember.id,
          name: currentSelectedMember.name,
          role: 'staff',
          title: currentSelectedMember.role || 'Barber & Stylist',
          avatar: currentSelectedMember.avatar
        };

        localStorage.setItem('aquiness_staff_auth', JSON.stringify({
          authenticated: true,
          type: 'pin',
          user,
          timestamp: Date.now()
        }));

        onSuccess(user);
      } else {
        setPinError(`Incorrect PIN for ${currentSelectedMember.name.split(' ')[0]}.`);
        setTimeout(() => {
          setPin('');
          setPinError('');
        }, 800);
      }
    }
  };

  const handleNumberPress = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setPinError('');
      if (newPin.length === 4) {
        setTimeout(() => {
          verifyPin(newPin);
        }, 150);
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setPinError('');
  };

  // Listen to physical keyboard events
  useEffect(() => {
    if (authMode !== 'pin') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key >= '0' && e.key <= '9') {
        handleNumberPress(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Enter') {
        if (pin.length === 4) {
          verifyPin(pin);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, authMode, selectedStaffId]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length === 4) {
      verifyPin(pin);
    } else {
      setPinError('Please enter 4 digits.');
    }
  };

  // Firebase email authentication
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setLoading(true);

    if (!isFirebaseConfigured()) {
      setEmailError('Firebase Auth is not active. Please use the Quick PIN method.');
      setLoading(false);
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const isOwnerEmail = email.toLowerCase().includes('didula') || email.toLowerCase().includes('admin');
      
      const user: CurrentStaffUser = {
        id: isOwnerEmail ? 'staff-1' : (userCredential.user.uid || 'staff-firebase'),
        name: isOwnerEmail ? 'Didula Perera' : (userCredential.user.displayName || email.split('@')[0]),
        role: isOwnerEmail ? 'admin' : 'staff',
        title: isOwnerEmail ? 'Owner & Master Stylist' : 'Salon Stylist',
        email: email.trim(),
        avatar: isOwnerEmail ? staffList[0]?.avatar : undefined
      };

      localStorage.setItem('aquiness_staff_auth', JSON.stringify({
        authenticated: true,
        type: 'firebase',
        user,
        timestamp: Date.now()
      }));

      onSuccess(user);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        try {
          const newCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
          const isOwnerEmail = email.toLowerCase().includes('didula') || email.toLowerCase().includes('admin');
          const user: CurrentStaffUser = {
            id: isOwnerEmail ? 'staff-1' : newCred.user.uid,
            name: isOwnerEmail ? 'Didula Perera' : email.split('@')[0],
            role: isOwnerEmail ? 'admin' : 'staff',
            title: isOwnerEmail ? 'Owner & Master Stylist' : 'Salon Stylist',
            email: email.trim()
          };

          localStorage.setItem('aquiness_staff_auth', JSON.stringify({
            authenticated: true,
            type: 'firebase',
            user,
            timestamp: Date.now()
          }));

          onSuccess(user);
          return;
        } catch {
          setEmailError('Invalid email or password. You can also sign in with PIN.');
        }
      } else {
        setEmailError(err.message || 'Authentication failed. Please verify credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const activeStaffMembers = staffList.slice(0, 4);

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto flex flex-col items-center justify-center p-4 sm:p-6 transition-colors duration-300 select-none ${
      isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-[#f0f2f6] text-zinc-900'
    }`}>
      
      {/* Dark mode warm ambient glow */}
      {isDark && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      )}

      {/* Theme Toggle Icon (Sun / Moon) in top-right */}
      <button
        type="button"
        onClick={toggleTheme}
        className={`absolute top-4 right-4 sm:top-6 sm:right-6 p-2.5 rounded-full transition-all duration-200 z-10 ${
          isDark 
            ? 'bg-zinc-900 border border-zinc-800 text-amber-400 hover:text-amber-300 hover:border-amber-500/40 shadow-lg' 
            : 'bg-white border border-zinc-200/90 text-zinc-600 hover:text-zinc-900 shadow-sm'
        }`}
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        aria-label="Toggle Dark/Light Mode"
      >
        {isDark ? <Sun className="w-5 h-5 stroke-[2.2]" /> : <Moon className="w-5 h-5 stroke-[2.2]" />}
      </button>

      <div className="relative w-full max-w-[340px] sm:max-w-[360px] flex flex-col items-center">
        
        {/* Top Official Logo with Gold Glow */}
        <div className="relative">
          <div className={`absolute -inset-2 rounded-full blur-md opacity-75 pointer-events-none ${
            isDark 
              ? 'bg-gradient-to-r from-amber-500/70 via-amber-400/60 to-amber-600/70' 
              : 'bg-gradient-to-r from-amber-500/60 via-amber-400/50 to-amber-600/60'
          }`} />
          <img 
            src="/logo.png" 
            alt="Aquiness Barber Logo" 
            className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover ring-2 ring-amber-500 shadow-xl shadow-amber-500/35 hover:scale-105 transition-transform" 
          />
        </div>

        {/* Title & Subtitle */}
        <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight mt-3 text-center ${
          isDark ? 'text-white' : 'text-zinc-900'
        }`}>
          Staff sign in
        </h1>
        <p className={`text-xs sm:text-sm font-medium text-center mt-1 px-2 leading-relaxed ${
          isDark ? 'text-zinc-400' : 'text-zinc-500'
        }`}>
          Aquiness Barber · choose your name, then enter your PIN
        </p>

        {/* Segmented Control Pill Switcher */}
        <div className={`w-full p-1 rounded-xl flex items-center mt-4 sm:mt-5 transition-colors ${
          isDark 
            ? 'bg-zinc-900 border border-zinc-800' 
            : 'bg-[#e2e5eb] shadow-inner'
        }`}>
          <button
            type="button"
            onClick={() => { setAuthMode('pin'); setPinError(''); }}
            className={`flex-1 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold text-center transition-all ${
              authMode === 'pin' 
                ? isDark 
                  ? 'bg-amber-500 text-zinc-950 shadow-md font-bold' 
                  : 'bg-white text-zinc-900 shadow-sm' 
                : isDark 
                  ? 'text-zinc-400 hover:text-white font-medium' 
                  : 'text-zinc-600 hover:text-zinc-900 font-medium'
            }`}
          >
            PIN
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('email'); setEmailError(''); }}
            className={`flex-1 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold text-center transition-all ${
              authMode === 'email' 
                ? isDark 
                  ? 'bg-amber-500 text-zinc-950 shadow-md font-bold' 
                  : 'bg-white text-zinc-900 shadow-sm' 
                : isDark 
                  ? 'text-zinc-400 hover:text-white font-medium' 
                  : 'text-zinc-600 hover:text-zinc-900 font-medium'
            }`}
          >
            Email
          </button>
        </div>

        {/* PIN MODE FLOW */}
        {authMode === 'pin' ? (
          <form onSubmit={handleManualSubmit} className="w-full flex flex-col items-center mt-4 sm:mt-5">
            
            {/* Staff Selector (Horizontal Row) */}
            <div className="grid grid-cols-4 gap-2.5 w-full">
              {activeStaffMembers.map((member) => {
                const isSelected = selectedStaffId === member.id;
                const firstName = member.name.split(' ')[0];
                const initial = firstName.charAt(0);
                const isMemberAdmin = member.id === 'staff-1' || member.name.toLowerCase().includes('didula');

                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => {
                      setSelectedStaffId(member.id);
                      setPin('');
                      setPinError('');
                    }}
                    className="flex flex-col items-center group focus:outline-none"
                  >
                    <div 
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center font-bold text-lg sm:text-xl transition-all ${
                        isSelected 
                          ? isDark 
                            ? 'bg-amber-500 text-zinc-950 ring-2 ring-amber-500 ring-offset-2 ring-offset-zinc-950 shadow-lg shadow-amber-500/30' 
                            : 'bg-[#0d6efd] text-white ring-2 ring-[#0d6efd] ring-offset-2 ring-offset-[#f0f2f6] shadow-md' 
                          : isDark 
                            ? 'bg-zinc-900 text-zinc-200 border border-zinc-800 shadow-sm hover:border-zinc-700' 
                            : 'bg-white text-zinc-900 border border-zinc-200 shadow-sm hover:border-zinc-300'
                      }`}
                    >
                      {initial}
                    </div>
                    <span className={`text-xs font-bold mt-1.5 text-center truncate max-w-full ${
                      isDark ? 'text-zinc-100' : 'text-zinc-900'
                    }`}>
                      {firstName}
                    </span>
                    <span className={`text-[11px] text-center truncate max-w-full leading-none ${
                      isDark 
                        ? (isMemberAdmin ? 'text-amber-400 font-semibold' : 'text-zinc-400') 
                        : 'text-zinc-500'
                    }`}>
                      {isMemberAdmin ? 'Admin' : 'Stylist'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 4 PIN Dots Indicator */}
            <div className="flex items-center justify-center gap-3.5 my-4 sm:my-5">
              {[0, 1, 2, 3].map((index) => {
                const isFilled = pin.length > index;
                return (
                  <div
                    key={index}
                    className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                      isFilled
                        ? pinError 
                          ? 'bg-red-500 scale-125' 
                          : isDark 
                            ? 'bg-amber-400 scale-110 shadow-[0_0_8px_rgba(245,158,11,0.6)]' 
                            : 'bg-zinc-900 scale-110'
                        : isDark 
                          ? 'bg-zinc-800 border border-zinc-700' 
                          : 'bg-zinc-300'
                    }`}
                  />
                );
              })}
            </div>

            {/* Error Message if any */}
            {pinError && (
              <p className="text-xs text-red-500 font-semibold text-center mb-2 animate-shake">
                {pinError}
              </p>
            )}

            {/* Numeric Keypad (Calculator Style) */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 w-full">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleNumberPress(num.toString())}
                  className={`h-12 sm:h-14 rounded-2xl text-xl sm:text-2xl font-semibold transition-all flex items-center justify-center select-none ${
                    isDark 
                      ? 'bg-zinc-900/90 border border-zinc-800 text-white shadow-md active:bg-zinc-800 active:scale-95' 
                      : 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-zinc-200/60 text-zinc-900 active:bg-zinc-100 active:scale-95'
                  }`}
                >
                  {num}
                </button>
              ))}
              
              {/* Bottom row: empty spacer, 0, backspace */}
              <div />

              <button
                type="button"
                onClick={() => handleNumberPress('0')}
                className={`h-12 sm:h-14 rounded-2xl text-xl sm:text-2xl font-semibold transition-all flex items-center justify-center select-none ${
                  isDark 
                    ? 'bg-zinc-900/90 border border-zinc-800 text-white shadow-md active:bg-zinc-800 active:scale-95' 
                    : 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-zinc-200/60 text-zinc-900 active:bg-zinc-100 active:scale-95'
                }`}
              >
                0
              </button>

              <button
                type="button"
                onClick={handleBackspace}
                className={`h-12 sm:h-14 rounded-2xl active:scale-95 transition-all flex items-center justify-center select-none ${
                  isDark 
                    ? 'text-zinc-400 hover:text-white active:bg-zinc-800' 
                    : 'text-zinc-800 active:bg-zinc-200/60'
                }`}
                title="Backspace"
                aria-label="Backspace"
              >
                <Delete className="w-6 h-6 stroke-[1.8]" />
              </button>
            </div>

            {/* Solid Action Button */}
            <button
              type="submit"
              className={`w-full mt-4 sm:mt-5 py-3.5 sm:py-4 rounded-2xl font-bold text-sm sm:text-base active:scale-[0.99] transition-all text-center ${
                isDark 
                  ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-zinc-950 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40' 
                  : 'bg-[#0d6efd] hover:bg-[#0b5ed7] text-white shadow-md shadow-[#0d6efd]/20'
              }`}
            >
              Sign in as {currentSelectedMember.name.split(' ')[0]}
            </button>

          </form>
        ) : (
          /* EMAIL MODE FLOW */
          <form onSubmit={handleEmailSubmit} className="w-full space-y-3.5 mt-5">
            <div>
              <label className={`block text-xs font-semibold mb-1 ${
                isDark ? 'text-zinc-300' : 'text-zinc-600'
              }`}>
                Staff Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="didula@saloonaquiness.lk"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm focus:outline-none transition-colors ${
                    isDark 
                      ? 'bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:border-amber-500' 
                      : 'bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:ring-2 focus:ring-[#0d6efd]'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1 ${
                isDark ? 'text-zinc-300' : 'text-zinc-600'
              }`}>
                Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={`w-full pl-10 pr-10 py-3 rounded-xl text-sm focus:outline-none transition-colors ${
                    isDark 
                      ? 'bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:border-amber-500' 
                      : 'bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:ring-2 focus:ring-[#0d6efd]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
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
              className={`w-full py-3.5 rounded-2xl font-bold text-sm shadow-md disabled:opacity-50 transition-all text-center ${
                isDark 
                  ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-zinc-950 shadow-amber-500/25' 
                  : 'bg-[#0d6efd] hover:bg-[#0b5ed7] text-white shadow-[#0d6efd]/20'
              }`}
            >
              {loading ? 'Signing in...' : 'Sign In with Email'}
            </button>
          </form>
        )}

        {/* Back to Client Booking Link */}
        <button
          type="button"
          onClick={onCancel}
          className={`mt-4 text-xs sm:text-sm font-semibold transition-colors ${
            isDark ? 'text-zinc-400 hover:text-amber-400' : 'text-[#0d6efd] hover:text-[#0b5ed7]'
          }`}
        >
          Back to client booking
        </button>

      </div>
    </div>
  );
};
