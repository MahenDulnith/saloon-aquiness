import React, { useState, useEffect } from 'react';
import { Delete, Mail, KeyRound, Eye, EyeOff, AlertCircle } from 'lucide-react';
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
      // Don't trigger if user is focusing an input
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

  // Staff members for the selector row
  const activeStaffMembers = staffList.slice(0, 4);

  return (
    <div className="fixed inset-0 z-50 bg-[#f0f2f6] overflow-y-auto flex flex-col items-center justify-center p-4 sm:p-6 text-zinc-900 select-none">
      
      <div className="w-full max-w-[340px] sm:max-w-[360px] flex flex-col items-center">
        
        {/* Top Official Logo */}
        <img 
          src="/logo.png" 
          alt="Aquiness Barber Logo" 
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover shadow-lg ring-2 ring-black/5 hover:scale-105 transition-transform" 
        />

        {/* Title & Subtitle */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight mt-3 text-center">
          Staff sign in
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 font-medium text-center mt-1 px-2 leading-relaxed">
          Aquiness Barber · choose your name, then enter your PIN
        </p>

        {/* Segmented Control Pill Switcher */}
        <div className="w-full bg-[#e2e5eb] p-1 rounded-xl flex items-center mt-4 sm:mt-5 shadow-inner">
          <button
            type="button"
            onClick={() => { setAuthMode('pin'); setPinError(''); }}
            className={`flex-1 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold text-center transition-all ${
              authMode === 'pin' 
                ? 'bg-white text-zinc-900 shadow-sm' 
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
                ? 'bg-white text-zinc-900 shadow-sm' 
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
                          ? 'bg-[#0d6efd] text-white ring-2 ring-[#0d6efd] ring-offset-2 ring-offset-[#f0f2f6] shadow-md' 
                          : 'bg-white text-zinc-900 border border-zinc-200 shadow-sm hover:border-zinc-300'
                      }`}
                    >
                      {initial}
                    </div>
                    <span className="text-xs font-bold text-zinc-900 mt-1.5 text-center truncate max-w-full">
                      {firstName}
                    </span>
                    <span className="text-[11px] text-zinc-500 text-center truncate max-w-full leading-none">
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
                          : 'bg-zinc-900 scale-110'
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
                  className="h-12 sm:h-14 rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-zinc-200/60 text-xl sm:text-2xl font-semibold text-zinc-900 active:bg-zinc-100 active:scale-95 transition-all flex items-center justify-center select-none"
                >
                  {num}
                </button>
              ))}
              
              {/* Bottom row: empty spacer, 0, backspace */}
              <div />

              <button
                type="button"
                onClick={() => handleNumberPress('0')}
                className="h-12 sm:h-14 rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-zinc-200/60 text-xl sm:text-2xl font-semibold text-zinc-900 active:bg-zinc-100 active:scale-95 transition-all flex items-center justify-center select-none"
              >
                0
              </button>

              <button
                type="button"
                onClick={handleBackspace}
                className="h-12 sm:h-14 rounded-2xl active:bg-zinc-200/60 active:scale-95 transition-all flex items-center justify-center select-none text-zinc-800"
                title="Backspace"
                aria-label="Backspace"
              >
                <Delete className="w-6 h-6 stroke-[1.8]" />
              </button>
            </div>

            {/* Solid Blue Action Button */}
            <button
              type="submit"
              className="w-full mt-4 sm:mt-5 py-3.5 sm:py-4 rounded-2xl bg-[#0d6efd] hover:bg-[#0b5ed7] active:bg-[#0a58ca] text-white font-bold text-sm sm:text-base shadow-md shadow-[#0d6efd]/20 active:scale-[0.99] transition-all text-center"
            >
              Sign in as {currentSelectedMember.name.split(' ')[0]}
            </button>

          </form>
        ) : (
          /* EMAIL MODE FLOW */
          <form onSubmit={handleEmailSubmit} className="w-full space-y-3.5 mt-5">
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1">
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
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-zinc-200 text-zinc-900 text-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#0d6efd]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1">
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
                  className="w-full pl-10 pr-10 py-3 rounded-xl bg-white border border-zinc-200 text-zinc-900 text-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#0d6efd]"
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
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{emailError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-[#0d6efd] hover:bg-[#0b5ed7] text-white font-bold text-sm shadow-md disabled:opacity-50 transition-all text-center"
            >
              {loading ? 'Signing in...' : 'Sign In with Email'}
            </button>
          </form>
        )}

        {/* Back to Client Booking Link */}
        <button
          type="button"
          onClick={onCancel}
          className="mt-4 text-xs sm:text-sm font-semibold text-[#0d6efd] hover:text-[#0b5ed7] transition-colors"
        >
          Back to client booking
        </button>

      </div>
    </div>
  );
};
