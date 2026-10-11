import React, { useState } from 'react';
import { 
  Lock, Mail, KeyRound, AlertCircle, ArrowRight, 
  Scissors, Eye, EyeOff, Crown, User, Check
} from 'lucide-react';
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

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');

    // Admin PINs: 1234 or 7788
    // Staff PINs: 5678 or 1234
    const trimmedPin = pin.trim();

    if (isDidulaAdmin) {
      if (trimmedPin === '1234' || trimmedPin === '7788') {
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
        setPinError('Incorrect Admin PIN. (Default Admin PIN is 1234)');
      }
    } else {
      // Staff member login
      if (trimmedPin === '5678' || trimmedPin === '1234') {
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
        setPinError(`Incorrect PIN for ${currentSelectedMember.name}. (Default Staff PIN is 5678 or 1234)`);
      }
    }
  };

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
      console.warn("Firebase Auth Error:", err);
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
          setEmailError('Invalid email or password. You can also sign in with Quick PIN.');
        }
      } else {
        setEmailError(err.message || 'Authentication failed. Please verify credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-amber-500/30 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden animate-fade-in">
        
        {/* Ambient glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="text-center space-y-2 relative">
          <img 
            src="/logo.png" 
            alt="Saloon Aquiness" 
            className="w-16 h-16 rounded-full mx-auto object-cover ring-2 ring-amber-500/50 shadow-lg shadow-amber-500/20"
          />
          <h2 className="font-serif text-2xl font-bold text-white tracking-wide">Saloon Aquiness Staff Portal</h2>
          <p className="text-xs text-zinc-400">
            Sign in to manage appointments, customer check-ins, and daily schedules.
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
            🔑 Staff PIN Access
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
            ✉️ Firebase Email Login
          </button>
        </div>

        {/* PIN LOGIN FLOW */}
        {authMode === 'pin' ? (
          <form onSubmit={handlePinSubmit} className="space-y-5">
            
            {/* Step 1: Identity Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-2">
                1. Select Who Is Signing In
              </label>
              
              <div className="grid grid-cols-2 gap-2.5">
                {staffList.map((member) => {
                  const isSelected = selectedStaffId === member.id;
                  const isDidula = member.id === 'staff-1' || member.name.toLowerCase().includes('didula');

                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => {
                        setSelectedStaffId(member.id);
                        setPin('');
                        setPinError('');
                      }}
                      className={`p-3 rounded-2xl text-left border transition-all flex items-center gap-3 relative ${
                        isSelected 
                          ? 'bg-amber-500/15 border-amber-500 ring-1 ring-amber-500/50 shadow-md' 
                          : 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                      }`}
                    >
                      <div className="relative shrink-0">
                        <img 
                          src={member.avatar} 
                          alt={member.name}
                          className="w-10 h-10 rounded-full object-cover ring-1 ring-zinc-700"
                        />
                        {isDidula && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center text-[10px]">
                            <Crown className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <p className={`text-xs font-bold truncate ${isSelected ? 'text-amber-400' : 'text-white'}`}>
                            {member.name}
                          </p>
                        </div>
                        <p className="text-[10px] text-zinc-400 truncate">
                          {isDidula ? '👑 Admin (Owner)' : '✂️ Stylist'}
                        </p>
                      </div>

                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: PIN Input */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  2. Enter PIN for <span className="text-amber-400 font-bold">{currentSelectedMember.name}</span>
                </label>
                <span className="text-[11px] text-zinc-500 font-mono">
                  {isDidulaAdmin ? 'PIN: 1234' : 'PIN: 5678'}
                </span>
              </div>

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

              <p className="text-[11px] text-zinc-400 text-center mt-2.5">
                {isDidulaAdmin ? (
                  <span>👑 <strong className="text-amber-400">Admin Privileges:</strong> Full control over service catalog, prices, and staff.</span>
                ) : (
                  <span>✂️ <strong className="text-zinc-300">Stylist Privileges:</strong> View schedule, manage chairs, and update appointments.</span>
                )}
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
              <span>Sign In as {currentSelectedMember.name.split(' ')[0]}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          /* FIREBASE EMAIL LOGIN FORM */
          <form onSubmit={handleEmailSubmit} className="space-y-4 text-xs">
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
              {loading ? <span>Authenticating with Firebase...</span> : <span>Sign In with Firebase</span>}
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
