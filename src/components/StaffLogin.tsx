import React, { useState, useEffect, useRef } from 'react';
import { Delete, Mail, KeyRound, Eye, EyeOff, AlertCircle, Sun, Moon } from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../firebase/config';
import { CurrentStaffUser, StaffMember } from '../types';
import { INITIAL_STAFF } from '../data/mockData';
import { FirebaseService } from '../services/firebaseService';

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
  const pinRef = useRef<string>('');
  pinRef.current = pin;
  const [pinError, setPinError] = useState<string>('');

  // Brute-force protection: Lockout and email alert on 3+ failed attempts
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [isLockedOut, setIsLockedOut] = useState<boolean>(false);
  const [lockoutTimer, setLockoutTimer] = useState<number>(0);

  // Countdown timer for lockout
  useEffect(() => {
    if (!isLockedOut || lockoutTimer <= 0) return;
    const interval = setInterval(() => {
      setLockoutTimer(prev => {
        if (prev <= 1) {
          setIsLockedOut(false);
          setPinError('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isLockedOut, lockoutTimer]);

  // Email state
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [emailError, setEmailError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [resetSent, setResetSent] = useState<boolean>(false);

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setEmailError('Please enter your email above to reset password.');
      return;
    }
    setEmailError('');
    try {
      if (isFirebaseConfigured()) {
        await sendPasswordResetEmail(auth, email.trim());
      }
      setResetSent(true);
      setTimeout(() => setResetSent(false), 5000);
    } catch (err: any) {
      setEmailError(err.message || 'Could not send reset email.');
    }
  };

  // Active selected member
  const currentSelectedMember = staffList.find(s => s.id === selectedStaffId) || staffList[0] || {
    id: 'staff-1',
    name: 'Didula Perera',
    role: 'Founder & Master Stylist',
    avatar: '',
    specialty: 'Master Barber'
  };

  const isDidulaAdmin = currentSelectedMember.id === 'staff-1' || currentSelectedMember.name.toLowerCase().includes('didula');

  // Verify PIN logic
  const verifyPin = (pinToTest: string) => {
    if (isLockedOut) return;
    const trimmed = pinToTest.trim();
    const configuredPin = currentSelectedMember.pin ? currentSelectedMember.pin.trim() : '';

    // Master PIN is 1018 (replaces 1234). 7788 remains Didula's master recovery PIN.
    const isMasterMatch = trimmed === '1018' || (isDidulaAdmin && trimmed === '7788');
    const isCustomMatch = configuredPin !== '' && trimmed === configuredPin;
    const isCorrect = isMasterMatch || isCustomMatch;

    if (isCorrect) {
      setFailedAttempts(0);
      setIsLockedOut(false);
      setLockoutTimer(0);

      const cleanAvatar = currentSelectedMember.avatar && !currentSelectedMember.avatar.includes('unsplash.com')
        ? currentSelectedMember.avatar
        : '';

      const user: CurrentStaffUser = {
        id: currentSelectedMember.id,
        name: currentSelectedMember.name,
        role: isDidulaAdmin ? 'admin' : 'staff',
        title: currentSelectedMember.role || (isDidulaAdmin ? 'Owner & Master Stylist' : 'Barber & Stylist'),
        avatar: cleanAvatar
      };

      localStorage.setItem('aquiness_staff_auth', JSON.stringify({
        authenticated: true,
        type: 'pin',
        user,
        timestamp: Date.now()
      }));

      FirebaseService.sendStaffLoginAlert(`Successful PIN login: ${user.name} (${user.role})`);
      onSuccess(user);
    } else {
      const newFailCount = failedAttempts + 1;
      setFailedAttempts(newFailCount);

      if (newFailCount >= 3) {
        // Send urgent email alert to Didula immediately
        FirebaseService.sendStaffLoginAlert(
          `3+ Consecutive Failed PIN attempts for ${currentSelectedMember.name} (Suspicious sign-in activity)`,
          true
        );
        setIsLockedOut(true);
        setLockoutTimer(30);
        setPinError('Too many failed attempts (3). Keypad locked for 30s. Security alert sent to Didula.');
        setPin('');
        pinRef.current = '';
      } else {
        FirebaseService.sendStaffLoginAlert(
          `Failed PIN entered for ${currentSelectedMember.name} (Attempt ${newFailCount}/3)`
        );
        const remaining = 3 - newFailCount;
        setPinError(`Incorrect PIN. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`);
        setTimeout(() => {
          setPin('');
          pinRef.current = '';
          if (!isLockedOut) setPinError('');
        }, 900);
      }
    }
  };

  const handleNumberPress = (digit: string) => {
    if (isLockedOut) return;
    setPin(prev => {
      if (prev.length >= 4) return prev;
      const next = prev + digit;
      pinRef.current = next;
      if (next.length === 4) {
        setTimeout(() => {
          verifyPin(next);
        }, 80);
      }
      return next;
    });
    setPinError('');
  };

  const handleBackspace = () => {
    if (isLockedOut) return;
    setPin(prev => {
      const next = prev.slice(0, -1);
      pinRef.current = next;
      return next;
    });
    setPinError('');
  };

  // Listen to physical keyboard events
  useEffect(() => {
    if (authMode !== 'pin' || isLockedOut) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLockedOut) return;
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
  }, [pin, authMode, selectedStaffId, isLockedOut]);

  const handleManualSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
        avatar: isOwnerEmail 
          ? (staffList[0]?.avatar && !staffList[0]?.avatar.includes('unsplash.com') ? staffList[0]?.avatar : '') 
          : undefined
      };

      localStorage.setItem('aquiness_staff_auth', JSON.stringify({
        authenticated: true,
        type: 'firebase',
        user,
        timestamp: Date.now()
      }));

      FirebaseService.sendStaffLoginAlert(`Successful Email login: ${user.name} (${email.trim()})`);
      onSuccess(user);
    } catch (err: any) {
      FirebaseService.sendStaffLoginAlert(`Failed Email login attempt: ${email.trim()}`);
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

          FirebaseService.sendStaffLoginAlert(`New Staff registered & logged in: ${user.name} (${email.trim()})`);
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

  const activeStaffMembers = staffList.length > 0 ? staffList : [currentSelectedMember];

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto ${authMode === 'pin' ? 'overscroll-none' : ''} flex flex-col items-center justify-between transition-colors duration-300 select-none ${
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
        style={{ top: 'max(calc(env(safe-area-inset-top, 0px) + 16px), 24px)' }}
        className={`fixed right-4 min-[420px]:right-6 p-2.5 rounded-full transition-all duration-200 z-20 ${
          isDark 
            ? 'bg-zinc-900 border border-zinc-800 text-amber-400 hover:text-amber-300 hover:border-amber-500/40 shadow-lg' 
            : 'bg-white border border-zinc-200/90 text-zinc-700 hover:text-zinc-900 shadow-sm'
        }`}
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        aria-label="Toggle Dark/Light Mode"
      >
        {isDark ? <Sun className="w-5 h-5 stroke-[2.2]" /> : <Moon className="w-5 h-5 stroke-[2.2]" />}
      </button>

      {/* Main Full-Height Container */}
      <div 
        style={{
          paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 16px), 24px)',
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 14px)'
        }}
        className="relative w-full max-w-[340px] min-[390px]:max-w-[356px] min-[420px]:max-w-[390px] sm:max-w-[400px] min-h-[100dvh] flex flex-col justify-between px-3 min-[420px]:px-4"
      >
        
        {/* UPPER SECTION: Logo, Title, Subtitle, Segmented Switcher, Staff Selector (in PIN mode) */}
        <div className="w-full flex flex-col items-center">
          
          {/* 1. Official Logo with Gold Glow */}
          <div className="relative mt-1 min-[420px]:mt-2">
            <div className={`absolute -inset-2 rounded-full blur-md opacity-75 pointer-events-none ${
              isDark 
                ? 'bg-gradient-to-r from-amber-500/70 via-amber-400/60 to-amber-600/70' 
                : 'bg-gradient-to-r from-amber-500/60 via-amber-400/50 to-amber-600/60'
            }`} />
            <img 
              src="/logo.png" 
              alt="Aquiness Barber Logo" 
              className="relative w-16 h-16 min-[420px]:w-20 min-[420px]:h-20 rounded-full object-cover ring-2 ring-amber-500 shadow-xl shadow-amber-500/35 hover:scale-105 transition-transform" 
            />
          </div>

          {/* 2. Title & Subtitle */}
          <h1 className={`text-2xl min-[420px]:text-3xl font-extrabold tracking-tight mt-2.5 min-[420px]:mt-3 text-center ${
            isDark ? 'text-white' : 'text-zinc-900'
          }`}>
            Staff sign in
          </h1>
          <p className={`text-xs min-[420px]:text-sm font-medium text-center mt-0.5 px-2 leading-relaxed ${
            isDark ? 'text-zinc-400' : 'text-zinc-500'
          }`}>
            Aquiness Barber
          </p>

          {/* 3. Segmented Control Pill Switcher - FIRST (ABOVE STAFF NAMES) */}
          <div className={`w-full p-1 rounded-xl flex items-center mt-3.5 min-[420px]:mt-4.5 transition-colors ${
            isDark 
              ? 'bg-zinc-900 border border-zinc-800' 
              : 'bg-[#e2e5eb] shadow-inner'
          }`}>
            <button
              type="button"
              onClick={() => { setAuthMode('pin'); setPinError(''); setPin(''); pinRef.current = ''; }}
              className={`flex-1 py-1.5 min-[420px]:py-2 rounded-lg text-xs min-[420px]:text-sm font-bold text-center transition-all ${
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
              onClick={() => { setAuthMode('email'); setEmailError(''); setPin(''); pinRef.current = ''; }}
              className={`flex-1 py-1.5 min-[420px]:py-2 rounded-lg text-xs min-[420px]:text-sm font-bold text-center transition-all ${
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

          {/* 4. Staff Selector (Horizontal Row) - ONLY IN PIN MODE */}
          {authMode === 'pin' && (
            <div className="flex items-center justify-center gap-3.5 min-[420px]:gap-5 w-full mt-4 min-[420px]:mt-5 flex-wrap">
              {activeStaffMembers.map((member) => {
                const isSelected = selectedStaffId === member.id;
                const firstName = member.name.split(' ')[0];
                const initial = firstName.charAt(0);
                const isMemberAdmin = member.id === 'staff-1' || member.name.toLowerCase().includes('didula') || member.role.toLowerCase().includes('admin');

                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => {
                      setSelectedStaffId(member.id);
                      setPin('');
                      pinRef.current = '';
                      setPinError('');
                      const defaultEmail = member.id === 'staff-1' || member.name.toLowerCase().includes('didula')
                        ? 'didula@saloonaquiness.lk'
                        : (member.email || `${member.name.toLowerCase().split(' ')[0]}@saloonaquiness.lk`);
                      setEmail(defaultEmail);
                    }}
                    className="flex flex-col items-center group focus:outline-none min-w-[64px] max-w-[80px]"
                  >
                    <div 
                      className={`w-12 h-12 min-[420px]:w-14 min-[420px]:h-14 rounded-full flex items-center justify-center font-bold text-lg min-[420px]:text-xl transition-all overflow-hidden relative ${
                        isSelected 
                          ? isDark 
                            ? 'bg-amber-500 text-zinc-950 ring-2 ring-amber-500 ring-offset-2 ring-offset-zinc-950 shadow-lg shadow-amber-500/30' 
                            : 'bg-[#0d6efd] text-white ring-2 ring-[#0d6efd] ring-offset-2 ring-offset-[#f0f2f6] shadow-md' 
                          : isDark 
                            ? 'bg-zinc-900 text-zinc-200 border border-zinc-800 shadow-sm hover:border-zinc-700' 
                            : 'bg-white text-zinc-900 border border-zinc-200 shadow-sm hover:border-zinc-300'
                      }`}
                    >
                      {member.avatar ? (
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : null}
                      <span className={member.avatar ? 'sr-only' : 'block'}>
                        {initial}
                      </span>
                    </div>
                    <span className={`text-xs min-[420px]:text-sm font-bold mt-1.5 text-center truncate max-w-full ${
                      isDark ? 'text-zinc-100' : 'text-zinc-900'
                    }`}>
                      {firstName}
                    </span>
                    <span className={`text-[11px] min-[420px]:text-xs text-center truncate max-w-full leading-none mt-0.5 ${
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
          )}

          {/* 5. In EMAIL MODE: Input fields directly below switch */}
          {authMode === 'email' && (
            <div className="w-full mt-4 min-[420px]:mt-6 space-y-4">
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${
                  isDark ? 'text-zinc-300' : 'text-zinc-700'
                }`}>
                  Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="name@aquiness.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 rounded-2xl text-sm focus:outline-none transition-colors ${
                      isDark 
                        ? 'bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:border-amber-500' 
                        : 'bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:ring-2 focus:ring-[#0d6efd] shadow-sm'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${
                  isDark ? 'text-zinc-300' : 'text-zinc-700'
                }`}>
                  Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className={`w-full pl-10 pr-10 py-3 rounded-2xl text-sm focus:outline-none transition-colors ${
                      isDark 
                        ? 'bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:border-amber-500' 
                        : 'bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:ring-2 focus:ring-[#0d6efd] shadow-sm'
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

              {/* Forgot password link */}
              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className={`text-xs font-semibold hover:underline transition-colors ${
                    isDark ? 'text-amber-400' : 'text-[#0d6efd]'
                  }`}
                >
                  Forgot password?
                </button>
              </div>

              {emailError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{emailError}</span>
                </div>
              )}

              {resetSent && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                  <span>Password reset email sent! Check your inbox.</span>
                </div>
              )}
            </div>
          )}

        </div>

        {/* BOTTOM SECTION */}
        {authMode === 'pin' ? (
          <div 
            className="w-full flex flex-col items-center mt-auto pb-1 min-[420px]:pb-2 touch-none select-none"
            style={{ touchAction: 'none' }}
          >
            
            {/* "Enter PIN for Didula" label */}
            <p className={`text-xs min-[420px]:text-sm mb-2 text-center transition-colors ${
              isDark ? 'text-zinc-400' : 'text-zinc-600'
            }`}>
              Enter PIN for <span className={`font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>{currentSelectedMember.name.split(' ')[0]}</span>
            </p>

            {/* 4 PIN Dots Indicator */}
            <div className="flex items-center justify-center gap-3.5 min-[420px]:gap-4 mb-3.5 min-[420px]:mb-5 select-none pointer-events-none">
              {[0, 1, 2, 3].map((index) => {
                const isFilled = pin.length > index;
                return (
                  <div
                    key={index}
                    className={`w-3.5 h-3.5 min-[420px]:w-4 min-[420px]:h-4 rounded-full transition-all duration-150 ${
                      isFilled
                        ? pinError 
                          ? 'bg-red-500 scale-125' 
                          : isDark 
                            ? 'bg-amber-400 scale-110 shadow-[0_0_8px_rgba(245,158,11,0.6)]' 
                            : 'bg-zinc-900 scale-110'
                        : isDark 
                          ? 'bg-zinc-800 border border-zinc-700' 
                          : 'bg-[#d0d4dc]'
                    }`}
                  />
                );
              })}
            </div>

            {/* Error Message or Lockout Security Banner */}
            {isLockedOut ? (
              <div className="w-full bg-red-500/10 border border-red-500/40 rounded-2xl p-3 mb-3 text-center space-y-1 animate-pulse">
                <div className="flex items-center justify-center gap-1.5 text-red-500 font-bold text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Security Lockout: 3 Failed Attempts</span>
                </div>
                <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  Keypad locked for security. Alert email dispatched to Didula.
                </p>
                <p className="text-sm font-mono font-extrabold text-red-500">
                  Try again in {lockoutTimer}s
                </p>
              </div>
            ) : pinError ? (
              <p className="text-xs text-red-500 font-semibold text-center mb-2 animate-shake">
                {pinError}
              </p>
            ) : null}

            {/* Numeric Keypad */}
            <div 
              className="grid grid-cols-3 gap-2.5 min-[420px]:gap-3 w-full touch-none select-none"
              style={{ touchAction: 'none', WebkitUserSelect: 'none' }}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  disabled={isLockedOut}
                  onClick={() => handleNumberPress(num.toString())}
                  style={{ touchAction: 'none', WebkitTapHighlightColor: 'transparent' }}
                  className={`h-11 min-[420px]:h-12 rounded-full text-xl min-[420px]:text-2xl font-semibold transition-colors duration-75 flex items-center justify-center select-none cursor-pointer disabled:opacity-30 disabled:pointer-events-none active:scale-[0.96] ${
                    isDark 
                      ? 'bg-zinc-900 border border-zinc-800 text-white shadow-sm active:bg-zinc-800' 
                      : 'bg-white shadow-[0_2px_6px_rgba(0,0,0,0.04)] border border-zinc-200/50 text-zinc-900 active:bg-zinc-100'
                  }`}
                >
                  {num}
                </button>
              ))}
              
              {/* Bottom row: empty spacer, 0, backspace */}
              <div />

              <button
                type="button"
                disabled={isLockedOut}
                onClick={() => handleNumberPress('0')}
                style={{ touchAction: 'none', WebkitTapHighlightColor: 'transparent' }}
                className={`h-11 min-[420px]:h-12 rounded-full text-xl min-[420px]:text-2xl font-semibold transition-colors duration-75 flex items-center justify-center select-none cursor-pointer disabled:opacity-30 disabled:pointer-events-none active:scale-[0.96] ${
                  isDark 
                    ? 'bg-zinc-900 border border-zinc-800 text-white shadow-sm active:bg-zinc-800' 
                    : 'bg-white shadow-[0_2px_6px_rgba(0,0,0,0.04)] border border-zinc-200/50 text-zinc-900 active:bg-zinc-100'
                }`}
              >
                0
              </button>

              <button
                type="button"
                disabled={isLockedOut}
                onClick={handleBackspace}
                style={{ touchAction: 'none', WebkitTapHighlightColor: 'transparent' }}
                className={`h-11 min-[420px]:h-12 rounded-full transition-colors duration-75 flex items-center justify-center select-none cursor-pointer disabled:opacity-30 disabled:pointer-events-none active:scale-[0.96] ${
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

            {/* Helper text & Back Link placed under keypad to prevent misclicks */}
            <p className={`text-[11px] min-[420px]:text-xs mt-3 min-[420px]:mt-3.5 text-center ${
              isDark ? 'text-zinc-500' : 'text-zinc-400'
            }`}>
              Signs in automatically after 4 digits
            </p>

            <button
              type="button"
              onClick={onCancel}
              className={`text-xs min-[420px]:text-sm font-semibold transition-colors mt-1.5 pb-1 ${
                isDark ? 'text-zinc-400 hover:text-amber-400' : 'text-[#0d6efd] hover:text-[#0b5ed7]'
              }`}
            >
              Back to client booking
            </button>

          </div>
        ) : (
          /* EMAIL MODE BOTTOM SECTION: Sign In button & Back link */
          <div className="w-full flex flex-col items-center mt-auto pb-2 min-[420px]:pb-4">
            <button
              type="button"
              onClick={handleEmailSubmit}
              disabled={loading}
              className={`w-full py-3.5 min-[420px]:py-4 rounded-2xl font-bold text-sm min-[420px]:text-base shadow-md disabled:opacity-50 transition-all text-center mb-2.5 ${
                isDark 
                  ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-zinc-950 shadow-amber-500/25 hover:shadow-amber-500/40' 
                  : 'bg-[#0d6efd] hover:bg-[#0b5ed7] text-white shadow-md shadow-[#0d6efd]/20'
              }`}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>

            <button
              type="button"
              onClick={onCancel}
              className={`text-xs min-[420px]:text-sm font-semibold transition-colors ${
                isDark ? 'text-zinc-400 hover:text-amber-400' : 'text-[#0d6efd] hover:text-[#0b5ed7]'
              }`}
            >
              Back to client booking
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
