import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Home as HomeIcon, Calendar as CalendarIcon, Ticket, User, Info,
  Scissors, Phone, MapPin, Clock, Sun, Moon, ChevronRight, 
  ChevronLeft, Check, Sparkles, Star, QrCode, 
  CalendarDays, ExternalLink, CheckCircle2, MessageSquare, AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { SalonService, StaffMember, Appointment, ServiceCategory } from '../types';
import { TIME_SLOTS } from '../data/mockData';
import { StorageService } from '../services/storage';
import { FirebaseService } from '../services/firebaseService';
import { 
  getSriLankaTimeParts, 
  getSriLankaTodayIso, 
  addDaysToIso, 
  formatSriLankaDateStr, 
  isSriLankaSlotInPast,
  SRI_LANKA_TIMEZONE 
} from '../utils/sriLankaTime';

interface CustomerAppProps {
  services: SalonService[];
  staff: StaffMember[];
  appointments: Appointment[];
  onAppointmentCreated: (appointment: Appointment) => void;
  onGoToStaffPortal: () => void;
}

// Today's special offer definition
const TODAYS_OFFER: SalonService = {
  id: 'offer-combo-1',
  name: 'Haircut + Beard Sculpt Combo',
  category: 'VIP Packages',
  price: 3800,
  durationMinutes: 70,
  description: 'Executive Precision Haircut paired with aromatic hot towel Royal Beard Sculpting. Save Rs. 500 today.',
  popular: true,
  active: true
};

// Dynamic salon open status calculator strictly in Sri Lanka Standard Time (Asia/Colombo, UTC+5:30)
function getSalonStatus() {
  const sl = getSriLankaTimeParts();
  const isWeekend = sl.weekday === 'Sun' || sl.weekday === 'Sat';
  const currentHour = sl.decimalHours;
  
  const openHour = isWeekend ? 8.5 : 9.0;
  const closeHour = isWeekend ? 21.0 : 20.0;
  const closeText = isWeekend ? '9:00 PM' : '8:00 PM';
  const openText = isWeekend ? '8:30 AM' : '9:00 AM';

  const isOpen = currentHour >= openHour && currentHour < closeHour;
  return {
    isOpen,
    statusText: isOpen ? `Open · until ${closeText}` : `Closed · opens ${openText}`,
    todayHours: isWeekend ? '8:30 AM – 9:00 PM' : '9:00 AM – 8:00 PM',
    timeZoneLabel: 'Sri Lanka Time (UTC+5:30)'
  };
}

// Structured time slots categorized into Morning, Afternoon, Evening
const TIME_PERIODS: { title: string; slots: string[] }[] = [
  {
    title: 'MORNING',
    slots: ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM']
  },
  {
    title: 'AFTERNOON',
    slots: ['12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM']
  },
  {
    title: 'EVENING',
    slots: ['05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM', '08:30 PM']
  }
];

function formatSlotDisplay(slot: string): string {
  // Strip leading 0 and AM/PM: "09:00 AM" -> "9:00", "02:30 PM" -> "2:30", "10:30 AM" -> "10:30"
  return slot.replace(/^0/, '').replace(/ (AM|PM)/, '');
}

// Flat list of all available time slots in chronological order
export const ALL_TIME_SLOTS: string[] = TIME_PERIODS.flatMap(p => p.slots);

// Local date string in YYYY-MM-DD format strictly in Sri Lanka Standard Time (Asia/Colombo)
export function getLocalDateString(): string {
  return getSriLankaTodayIso();
}

// Convert "09:30 AM" or "02:30 PM" to decimal hours (e.g. 9.5 or 14.5)
export function parseSlotToHours(slot: string): number {
  const match = slot.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === 'PM' && hours < 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return hours + minutes / 60;
}

// Check if a time slot is in the past for the specified date in Sri Lanka Standard Time
export function isSlotInPast(dateStr: string, slot: string): boolean {
  return isSriLankaSlotInPast(dateStr, slot);
}

// Computes smart default initial date & slot in Sri Lanka time (defaults to tomorrow if all slots today have concluded)
export function getInitialBookingDateAndSlot(): { date: string; slot: string } {
  const todayStr = getSriLankaTodayIso();

  const firstFutureSlotToday = ALL_TIME_SLOTS.find(slot => !isSriLankaSlotInPast(todayStr, slot));
  if (firstFutureSlotToday) {
    return { date: todayStr, slot: firstFutureSlotToday };
  }

  // All slots today have passed in Sri Lanka -> default to tomorrow morning
  const tomorrowStr = addDaysToIso(todayStr, 1);
  return { date: tomorrowStr, slot: ALL_TIME_SLOTS[0] || '09:00 AM' };
}

export const CustomerApp: React.FC<CustomerAppProps> = ({
  services,
  staff,
  appointments,
  onAppointmentCreated,
  onGoToStaffPortal
}) => {
  // Theme state: 'dark' (Luxury Dark & Gold) | 'light' (Clean iOS Light)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('aquiness_customer_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {}
    return 'dark'; // Default to luxury dark & gold
  });

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('aquiness_customer_theme', next);
      } catch {}
      return next;
    });
  };

  // Sync meta theme-color and html dark class with active theme
  useEffect(() => {
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', theme === 'light' ? '#f0f2f6' : '#09090b');
    }
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Secret 10-tap gesture on Settings/Profile Logo to access Staff Portal
  const [logoTapCount, setLogoTapCount] = useState<number>(0);
  const logoTapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogoTap = () => {
    if (logoTapTimeoutRef.current) {
      clearTimeout(logoTapTimeoutRef.current);
    }

    const nextCount = logoTapCount + 1;
    if (nextCount >= 10) {
      setLogoTapCount(0);
      // Trigger security alert email to Didula
      FirebaseService.sendStaffLoginAlert('Secret 10-tap logo gesture unlocked on Client Profile page');
      // Navigate to staff portal
      onGoToStaffPortal();
    } else {
      setLogoTapCount(nextCount);
      logoTapTimeoutRef.current = setTimeout(() => {
        setLogoTapCount(0);
      }, 3000);
    }
  };

  // Bottom Tabs: 'home' | 'book' | 'bookings' | 'info'
  const [activeTab, setActiveTab] = useState<'home' | 'book' | 'bookings' | 'info'>('home');

  // Booking Flow State: Step 1 (Service) -> 2 (Stylist) -> 3 (Schedule) -> 4 (Details) -> 5 (Confirmed Pass)
  const [step, setStep] = useState<number>(1);
  const [selectedService, setSelectedService] = useState<SalonService | null>(services[0] || null);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null); // null = "Any Available"
  const [selectedDate, setSelectedDate] = useState<string>(() => getInitialBookingDateAndSlot().date);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>(() => getInitialBookingDateAndSlot().slot);
  
  // Client input details
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Confirmed booking pass
  const [confirmedBooking, setConfirmedBooking] = useState<Appointment | null>(null);

  // Category filter in service step
  const [serviceCategory, setServiceCategory] = useState<string>('All');

  // My bookings stored locally
  const [myBookings, setMyBookings] = useState<Appointment[]>(() => {
    try {
      const saved = localStorage.getItem('aquiness_client_bookings');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modal for viewing a saved pass QR
  const [viewingPass, setViewingPass] = useState<Appointment | null>(null);

  // Real-time status calculator for header & past-slot expiry ticker
  const [salonStatus, setSalonStatus] = useState(getSalonStatus());
  const [timeTick, setTimeTick] = useState<number>(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setSalonStatus(getSalonStatus());
      setTimeTick(t => t + 1);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Available next 14 days strictly in Sri Lanka Standard Time
  const dateOptions = useMemo(() => {
    const dates = [];
    const todayIso = getSriLankaTodayIso();
    for (let i = 0; i < 14; i++) {
      const iso = addDaysToIso(todayIso, i);
      const [y, m, d] = iso.split('-').map(Number);
      const dateMidday = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
      const weekday = new Intl.DateTimeFormat('en-US', { timeZone: SRI_LANKA_TIMEZONE, weekday: 'short' }).format(dateMidday);
      const month = new Intl.DateTimeFormat('en-US', { timeZone: SRI_LANKA_TIMEZONE, month: 'short' }).format(dateMidday);
      const dayNum = d;
      dates.push({
        iso,
        weekday,
        month,
        dayNum,
        isToday: i === 0,
        isTomorrow: i === 1,
      });
    }
    return dates;
  }, []);

  // Selected date month & year uppercase in Sri Lanka time, e.g. "OCTOBER 2026"
  const selectedMonthYear = useMemo(() => {
    if (!selectedDate) return '';
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    return new Intl.DateTimeFormat('en-US', { timeZone: SRI_LANKA_TIMEZONE, month: 'long', year: 'numeric' }).format(dateObj).toUpperCase();
  }, [selectedDate]);

  // Formatted date string in Sri Lanka time, e.g. "Mon, 19 Oct"
  const formattedSelectedDate = useMemo(() => {
    if (!selectedDate) return '';
    return formatSriLankaDateStr(selectedDate);
  }, [selectedDate]);

  // Categories list
  const categories: (ServiceCategory | 'All')[] = [
    'All',
    'Hair',
    'Beard & Shave',
    'Facials & Skin',
    'Spa & Treatments',
    'VIP Packages'
  ];

  // Filtered services
  const filteredServices = useMemo(() => {
    return services.filter(srv => {
      const matchActive = srv.active !== false;
      const matchCat = serviceCategory === 'All' || srv.category === serviceCategory;
      return matchActive && matchCat;
    });
  }, [services, serviceCategory]);

  // 3 Popular services for Home screen
  const popularServices = useMemo(() => {
    const pops = services.filter(s => s.popular && s.active !== false);
    if (pops.length >= 3) return pops.slice(0, 3);
    return services.filter(s => s.active !== false).slice(0, 3);
  }, [services]);

  // Booked slots for chosen date & staff
  const bookedSlots = useMemo(() => {
    return appointments
      .filter(apt => apt.date === selectedDate && apt.status !== 'cancelled')
      .filter(apt => !selectedStaff || apt.staffId === selectedStaff.id || apt.staffId === 'any')
      .map(apt => apt.timeSlot);
  }, [appointments, selectedDate, selectedStaff]);

  // Whether the selected date has at least one valid future slot available
  const hasAvailableSlotsOnSelectedDate = useMemo(() => {
    return ALL_TIME_SLOTS.some(slot => 
      !isSlotInPast(selectedDate, slot) && !bookedSlots.includes(slot)
    );
  }, [selectedDate, bookedSlots, timeTick]);

  // Keep selectedTimeSlot valid when date, bookedSlots, or current time changes
  useEffect(() => {
    const isPast = isSlotInPast(selectedDate, selectedTimeSlot);
    const isBooked = bookedSlots.includes(selectedTimeSlot);

    if (isPast || isBooked || !selectedTimeSlot) {
      const firstValidSlot = ALL_TIME_SLOTS.find(slot => 
        !isSlotInPast(selectedDate, slot) && !bookedSlots.includes(slot)
      );
      setSelectedTimeSlot(firstValidSlot || '');
    }
  }, [selectedDate, bookedSlots, timeTick]);

  // Quick pre-select service & jump to stylist step
  const handleSelectServiceAndAdvance = (service: SalonService) => {
    setSelectedService(service);
    setStep(2); // advance to stylist step
    setActiveTab('book');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Confirm appointment submission
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!selectedService) {
      setFormError('Please choose a service');
      setStep(1);
      return;
    }

    if (!selectedTimeSlot || isSlotInPast(selectedDate, selectedTimeSlot)) {
      setFormError('The selected time slot has passed. Please choose an upcoming time slot.');
      setStep(3);
      return;
    }

    if (bookedSlots.includes(selectedTimeSlot)) {
      setFormError('The selected time slot is already booked. Please choose another slot.');
      setStep(3);
      return;
    }

    if (!customerName.trim()) {
      setFormError('Please enter your full name');
      return;
    }

    if (!customerPhone.trim() || customerPhone.replace(/\D/g, '').length < 8) {
      setFormError('Please enter a valid phone number (e.g. 077 123 4567)');
      return;
    }

    setIsSubmitting(true);
    const assignedStaff = selectedStaff || staff[0];

    const appointmentPayload = {
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail.trim() || undefined,
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      servicePrice: selectedService.price,
      serviceDuration: selectedService.durationMinutes,
      staffId: selectedStaff ? selectedStaff.id : 'any',
      staffName: selectedStaff ? selectedStaff.name : `Any Specialist (${assignedStaff.name})`,
      date: selectedDate,
      timeSlot: selectedTimeSlot,
      status: 'pending' as const,
      notes: notes.trim() || undefined
    };

    let createdApt: Appointment;
    try {
      createdApt = await FirebaseService.createAppointment(appointmentPayload);
    } catch {
      createdApt = StorageService.createAppointment(appointmentPayload);
    }

    // Save to user's local bookings
    setMyBookings(prev => {
      const updated = [createdApt, ...prev.filter(b => b.id !== createdApt.id)];
      try {
        localStorage.setItem('aquiness_client_bookings', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setConfirmedBooking(createdApt);
    onAppointmentCreated(createdApt);
    setIsSubmitting(false);
    setStep(5);

    // Trigger celebration confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {}
  };

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen select-none font-sans flex flex-col justify-between transition-colors duration-200 ${
      isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-[#f0f2f6] text-zinc-900'
    }`}>
      
      {/* Centered App Viewport */}
      <div className="w-full max-w-md mx-auto min-h-screen flex flex-col relative">

        {/* =========================================================================
            TAB 1: CUSTOMER HOME SCREEN (Fits 1 screen, Claude's Left Mockup)
        ========================================================================= */}
        {activeTab === 'home' && (
          <div className="flex flex-col w-full animate-fadeIn">
            
            {/* LOCKED TOP HEADER */}
            <header className={`sticky top-0 z-30 w-full backdrop-blur-md border-b app-header-safe-top transition-colors ${
              isDark 
                ? 'bg-zinc-950/90 border-zinc-800/80' 
                : 'bg-[#f0f2f6]/95 border-zinc-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)]'
            }`}>
              <div className="w-full px-4 pt-1.5 pb-3 flex items-center justify-between">
                
                {/* Logo & Shop Location */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <div className="absolute -inset-1 rounded-full blur-sm opacity-75 bg-gradient-to-r from-[#e5a43b] via-[#d9982f] to-[#b37d22] pointer-events-none" />
                    <img 
                      src="/logo.png" 
                      alt="Aquiness Barber" 
                      className="relative w-10 h-10 rounded-full object-cover ring-2 ring-[#e5a43b] shadow-md shrink-0"
                    />
                  </div>
                  <div className="min-w-0">
                    <h2 className={`font-extrabold text-base leading-tight truncate ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                      Aquiness Barber
                    </h2>
                    <p className={`text-xs truncate ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      Pallewela, Kuliyapitiya
                    </p>
                  </div>
                </div>

                {/* Right: Open Status & Theme Toggle */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[11px] font-semibold flex items-center gap-1.5 px-2.5 py-1 rounded-full ${
                    salonStatus.isOpen 
                      ? (isDark ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border border-emerald-200')
                      : (isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-200 text-zinc-600')
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${salonStatus.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
                    {salonStatus.statusText}
                  </span>

                  <button
                    type="button"
                    onClick={toggleTheme}
                    className={`p-2 rounded-full transition-colors ${
                      isDark 
                        ? 'bg-zinc-900 border border-zinc-800 text-[#e5a43b] hover:text-[#f3b552]' 
                        : 'bg-white border border-zinc-200/90 text-zinc-700 hover:text-zinc-900 shadow-sm'
                    }`}
                    title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                  >
                    {isDark ? <Sun className="w-4 h-4 stroke-[2.2]" /> : <Moon className="w-4 h-4 stroke-[2.2]" />}
                  </button>
                </div>

              </div>
            </header>

            {/* SCROLLABLE HOME CONTENT */}
            <main className="w-full flex-1 px-4 pt-4 pb-28 space-y-4">
              
              {/* Main Heading & Subtitle */}
              <div className="pt-1">
                <h1 className={`text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight ${
                  isDark ? 'text-white' : 'text-zinc-900'
                }`}>
                  Book your session
                </h1>
                <p className={`text-sm sm:text-base font-normal mt-1 leading-relaxed ${
                  isDark ? 'text-zinc-400' : 'text-zinc-600'
                }`}>
                  Haircuts, beard care and facials in Pallewela.
                </p>
              </div>

              {/* Primary "Book Appointment" Action (Solid Warm Gold in Dark Mode) */}
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setActiveTab('book');
                }}
                className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all ${
                  isDark
                    ? 'bg-[#e5a43b] hover:bg-[#d9982f] text-zinc-950 shadow-[#e5a43b]/20'
                    : 'bg-[#0d6efd] text-white hover:bg-blue-600 shadow-blue-500/20'
                }`}
              >
                <Scissors className="w-5 h-5 stroke-[2.2]" />
                Book appointment
              </button>

              {/* Call & Directions Quick Buttons (Dark Charcoal with Gold Text) */}
              <div className="grid grid-cols-2 gap-3">
                <a
                  href="tel:+94701333485"
                  className={`py-3 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all border ${
                    isDark
                      ? 'bg-[#18181b] border-zinc-800 text-[#e5a43b] hover:bg-zinc-800'
                      : 'bg-white border-zinc-200/80 text-[#0d6efd] hover:bg-blue-50/50 shadow-sm'
                  }`}
                >
                  <Phone className="w-4 h-4" />
                  Call
                </a>
                <a
                  href="https://maps.app.goo.gl/XsE4HhDeuy9DzFe67"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`py-3 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all border ${
                    isDark
                      ? 'bg-[#18181b] border-zinc-800 text-[#e5a43b] hover:bg-zinc-800'
                      : 'bg-white border-zinc-200/80 text-[#0d6efd] hover:bg-blue-50/50 shadow-sm'
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                  Directions
                </a>
              </div>

              {/* TODAY'S OFFER CARD (Claude's Dark Gold Home Mockup) */}
              <div 
                onClick={() => handleSelectServiceAndAdvance(TODAYS_OFFER)}
                className={`p-4 rounded-2xl border cursor-pointer active:scale-[0.99] transition-all ${
                  isDark
                    ? 'bg-[#18181b] border-zinc-800 hover:border-zinc-700 shadow-sm'
                    : 'bg-white border-zinc-200/90 hover:border-zinc-300 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className={`text-[11px] uppercase tracking-wider font-extrabold block mb-0.5 ${
                      isDark ? 'text-[#e5a43b]' : 'text-[#c26100]'
                    }`}>
                      TODAY'S OFFER
                    </span>
                    <h3 className={`font-extrabold text-base leading-snug truncate ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                      Haircut + Beard Sculpt Combo
                    </h3>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-base font-extrabold block leading-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                      Rs. 3,800
                    </span>
                    <span className="text-xs text-zinc-400 line-through block mt-0.5">
                      Rs. 4,300
                    </span>
                  </div>
                </div>
              </div>

              {/* POPULAR SERVICES LIST */}
              <div>
                <div className="flex items-center justify-between mb-2 px-1">
                  <h3 className={`font-extrabold text-base tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                    Popular services
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setActiveTab('book');
                    }}
                    className={`text-xs font-bold hover:underline ${isDark ? 'text-[#e5a43b]' : 'text-[#0d6efd]'}`}
                  >
                    See all
                  </button>
                </div>

                <div className={`rounded-2xl border overflow-hidden divide-y ${
                  isDark 
                    ? 'bg-[#18181b] border-zinc-800 divide-zinc-800/70' 
                    : 'bg-white border-zinc-200/80 divide-zinc-100 shadow-sm'
                }`}>
                  {popularServices.map(srv => (
                    <div
                      key={srv.id}
                      onClick={() => handleSelectServiceAndAdvance(srv)}
                      className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        isDark ? 'hover:bg-zinc-800/60' : 'hover:bg-zinc-50/80'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <h4 className={`font-bold text-sm leading-snug truncate ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                          {srv.name}
                        </h4>
                        <span className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                          {srv.durationMinutes} min
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                          Rs. {srv.price.toLocaleString()}
                        </span>
                        <ChevronRight className="w-4 h-4 text-zinc-500" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </main>
          </div>
        )}

        {/* =========================================================================
            TAB 2: BOOKING WIZARD FLOW (Steps 1 to 5)
        ========================================================================= */}
        {activeTab === 'book' && (
          <div className="flex flex-col w-full animate-fadeIn min-h-screen">
            
            {/* LOCKED TOP HEADER WITH 4-SEGMENT PROGRESS BAR (Claude's Right Mockup) */}
            <header className={`sticky top-0 z-30 w-full backdrop-blur-md border-b app-header-safe-top transition-colors ${
              isDark 
                ? 'bg-zinc-950/90 border-zinc-800/80' 
                : 'bg-[#f0f2f6]/95 border-zinc-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)]'
            }`}>
              <div className="w-full px-4 pt-1 pb-2.5">
                
                {/* Back to Home / Prev Step Link */}
                <div className="flex items-center justify-between mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (step === 1 || step === 5) {
                        setActiveTab('home');
                        setStep(1);
                      } else {
                        setStep(prev => prev - 1);
                      }
                    }}
                    className={`flex items-center gap-1 font-semibold text-sm hover:underline -ml-1 ${
                      isDark ? 'text-[#e5a43b]' : 'text-[#0d6efd]'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4 stroke-[2.2]" />
                    {step === 1 ? 'Home' : step === 2 ? 'Service' : step === 3 ? 'Stylist' : 'Date & time'}
                  </button>

                  <span className={`text-xs font-semibold ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    {step < 5 ? `Step ${step} of 4` : 'Confirmed'}
                  </span>
                </div>

                {/* 4-part segmented progress bar */}
                {step < 5 && (
                  <div className="grid grid-cols-4 gap-1.5 w-full">
                    {[1, 2, 3, 4].map(sNum => (
                      <div
                        key={sNum}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          sNum <= step
                            ? (isDark ? 'bg-[#e5a43b]' : 'bg-[#0d6efd]')
                            : (isDark ? 'bg-zinc-800' : 'bg-zinc-200')
                        }`}
                      />
                    ))}
                  </div>
                )}

              </div>
            </header>

            {/* STEP 1: CHOOSE SERVICE (Claude's Right Mockup) */}
            {step === 1 && (
              <main className="w-full flex-1 px-4 pt-4 pb-36 space-y-3.5">
                
                <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  Choose service
                </h1>

                {/* Horizontal Category Chips */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar -mx-4 px-4">
                  {categories.map(cat => {
                    const isSelected = serviceCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setServiceCategory(cat)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
                          isSelected
                            ? (isDark 
                                ? 'bg-[#e5a43b] text-zinc-950 shadow-sm' 
                                : 'bg-[#0d6efd] text-white shadow-sm')
                            : (isDark 
                                ? 'bg-[#1c1c1e] text-zinc-300 border border-zinc-800/80 hover:border-zinc-700' 
                                : 'bg-white text-zinc-700 border border-zinc-200/80 hover:border-zinc-300')
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>

                {/* Compact Service Rows List */}
                <div className={`rounded-2xl border overflow-hidden divide-y ${
                  isDark 
                    ? 'bg-[#18181b] border-zinc-800 divide-zinc-800/70' 
                    : 'bg-white border-zinc-200/80 divide-zinc-100 shadow-sm'
                }`}>
                  {filteredServices.map(srv => {
                    const isSelected = selectedService?.id === srv.id;
                    return (
                      <div
                        key={srv.id}
                        onClick={() => setSelectedService(srv)}
                        className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                          isSelected 
                            ? (isDark ? 'bg-[#241c10]' : 'bg-blue-50/60') 
                            : (isDark ? 'hover:bg-zinc-800/60' : 'hover:bg-zinc-50/80')
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <h4 className={`font-bold text-sm sm:text-base leading-snug truncate ${
                            isSelected 
                              ? (isDark ? 'text-white font-bold' : 'text-[#0d6efd]') 
                              : (isDark ? 'text-white' : 'text-zinc-900')
                          }`}>
                            {srv.name}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-0.5 text-xs">
                            <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>
                              {srv.durationMinutes} min
                            </span>
                            {srv.popular && (
                              <>
                                <span className={isDark ? 'text-zinc-600' : 'text-zinc-300'}>·</span>
                                <span className={`font-bold ${isDark ? 'text-[#e5a43b]' : 'text-amber-600'}`}>
                                  Popular
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`font-bold text-sm sm:text-base ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                            Rs. {srv.price.toLocaleString()}
                          </span>

                          {/* Radio Checkmark Circle */}
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                            isSelected
                              ? (isDark ? 'bg-[#e5a43b] text-zinc-950 font-bold' : 'bg-[#0d6efd] text-white')
                              : (isDark ? 'border-2 border-zinc-600' : 'border-2 border-zinc-300')
                          }`}>
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* LOCKED STICKY BOTTOM SUMMARY & CONTINUE BUTTON (Claude's Bottom Bar) */}
                <div 
                  style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)' }}
                  className={`fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-xl ${
                    isDark 
                      ? 'bg-zinc-950/95 border-zinc-800 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]' 
                      : 'bg-white/95 border-zinc-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]'
                  }`}
                >
                  <div className="max-w-md mx-auto px-4 pt-3 pb-2 space-y-2">
                    
                    {/* Summary row */}
                    <div className="flex items-center justify-between text-sm">
                      <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>
                        1 service · {selectedService?.durationMinutes || 45} min
                      </span>
                      <span className={`font-extrabold text-base ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                        Rs. {(selectedService?.price || 2500).toLocaleString()}
                      </span>
                    </div>

                    {/* Continue Button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedService) setStep(2);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`w-full py-3.5 rounded-2xl font-bold text-base shadow-md active:scale-[0.98] transition-all ${
                        isDark
                          ? 'bg-[#e5a43b] hover:bg-[#d9982f] text-zinc-950 shadow-[#e5a43b]/15'
                          : 'bg-[#0d6efd] text-white hover:bg-blue-600 shadow-blue-500/20'
                      }`}
                    >
                      Continue
                    </button>

                  </div>
                </div>

              </main>
            )}

            {/* STEP 2: CHOOSE STYLIST (Claude's Right Mockup) */}
            {step === 2 && (
              <main className="w-full flex-1 px-4 pt-4 pb-36 space-y-3.5">
                <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  Choose stylist
                </h1>

                {/* Stylist Selection List (Preserves rich avatars, ratings & roles in clean card group) */}
                <div className={`rounded-2xl border overflow-hidden divide-y ${
                  isDark 
                    ? 'bg-[#18181b] border-zinc-800 divide-zinc-800/70' 
                    : 'bg-white border-zinc-200/80 divide-zinc-100 shadow-sm'
                }`}>
                  
                  {/* Option 1: Any available */}
                  <div
                    onClick={() => setSelectedStaff(null)}
                    className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      selectedStaff === null
                        ? (isDark ? 'bg-[#241c10]' : 'bg-blue-50/60')
                        : (isDark ? 'hover:bg-zinc-800/60' : 'hover:bg-zinc-50/80')
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                        selectedStaff === null
                          ? (isDark ? 'bg-[#2a2415] text-[#e5a43b] ring-1 ring-[#e5a43b]/40' : 'bg-blue-100 text-[#0d6efd]')
                          : (isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500')
                      }`}>
                        <Sparkles className="w-5 h-5 stroke-[2.2]" />
                      </div>
                      <div className="min-w-0">
                        <h4 className={`font-bold text-sm sm:text-base leading-snug truncate ${
                          selectedStaff === null 
                            ? (isDark ? 'text-white font-bold' : 'text-[#0d6efd]') 
                            : (isDark ? 'text-white' : 'text-zinc-900')
                        }`}>
                          Any available
                        </h4>
                        <span className={`text-xs block ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                          Fastest booking
                        </span>
                      </div>
                    </div>

                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                      selectedStaff === null
                        ? (isDark ? 'bg-[#e5a43b] text-zinc-950 font-bold' : 'bg-[#0d6efd] text-white')
                        : (isDark ? 'border-2 border-zinc-600' : 'border-2 border-zinc-300')
                    }`}>
                      {selectedStaff === null && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>

                  {/* Option 2: Individual Stylists with Real Photos & Ratings */}
                  {staff.map(member => {
                    const isSelected = selectedStaff?.id === member.id;
                    return (
                      <div
                        key={member.id}
                        onClick={() => setSelectedStaff(member)}
                        className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                          isSelected
                            ? (isDark ? 'bg-[#241c10]' : 'bg-blue-50/60')
                            : (isDark ? 'hover:bg-zinc-800/60' : 'hover:bg-zinc-50/80')
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={member.avatar}
                            alt={member.name}
                            className={`w-11 h-11 rounded-full object-cover shrink-0 transition-all ${
                              isSelected
                                ? (isDark ? 'ring-2 ring-[#e5a43b]' : 'ring-2 ring-[#0d6efd]')
                                : (isDark ? 'ring-1 ring-zinc-700' : 'ring-2 ring-zinc-200/80')
                            }`}
                          />
                          <div className="min-w-0">
                            <h4 className={`font-bold text-sm sm:text-base leading-snug truncate ${
                              isSelected 
                                ? (isDark ? 'text-white font-bold' : 'text-[#0d6efd]') 
                                : (isDark ? 'text-white' : 'text-zinc-900')
                            }`}>
                              {member.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5 text-xs truncate">
                              <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>
                                {member.role}
                              </span>
                              <span className={isDark ? 'text-zinc-600' : 'text-zinc-300'}>·</span>
                              <div className="flex items-center gap-1 font-bold shrink-0 text-[#e5a43b]">
                                <Star className="w-3 h-3 fill-[#e5a43b] text-[#e5a43b]" />
                                <span>{member.rating}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                          isSelected
                            ? (isDark ? 'bg-[#e5a43b] text-zinc-950 font-bold' : 'bg-[#0d6efd] text-white')
                            : (isDark ? 'border-2 border-zinc-600' : 'border-2 border-zinc-300')
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}

                </div>

                {/* STICKY BOTTOM BAR (Matches Claude's Choose Stylist screen) */}
                <div 
                  style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)' }}
                  className={`fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-xl ${
                    isDark 
                      ? 'bg-zinc-950/95 border-zinc-800 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]' 
                      : 'bg-white/95 border-zinc-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]'
                  }`}
                >
                  <div className="max-w-md mx-auto px-4 pt-3 pb-2 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className={`truncate max-w-[240px] font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
                        {selectedService?.name || 'Executive Precision Haircut & Styling'}
                      </span>
                      <span className={`font-extrabold text-base ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                        Rs. {(selectedService?.price || 2500).toLocaleString()}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setStep(3);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`w-full py-3.5 rounded-2xl font-bold text-base shadow-md active:scale-[0.98] transition-all ${
                        isDark
                          ? 'bg-[#e5a43b] hover:bg-[#d9982f] text-zinc-950 shadow-[#e5a43b]/15'
                          : 'bg-[#0d6efd] text-white hover:bg-blue-600 shadow-blue-500/20'
                      }`}
                    >
                      Continue
                    </button>
                  </div>
                </div>

              </main>
            )}

            {/* STEP 3: CHOOSE DATE & TIME (Claude's Left Mockup) */}
            {step === 3 && (
              <main className="w-full flex-1 px-4 pt-4 pb-36 space-y-4">
                {/* Main Heading */}
                <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  Date & time
                </h1>

                {/* Month & Year header */}
                <div className="pt-0.5">
                  <span className={`text-xs font-bold uppercase tracking-wider block px-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    {selectedMonthYear}
                  </span>
                </div>

                {/* Horizontal Date Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar -mx-4 px-4">
                  {dateOptions.map(d => {
                    const isSelected = selectedDate === d.iso;
                    return (
                      <button
                        key={d.iso}
                        type="button"
                        onClick={() => setSelectedDate(d.iso)}
                        className={`flex flex-col items-center justify-center min-w-[52px] py-2.5 px-2 rounded-2xl transition-all ${
                          isSelected
                            ? (isDark 
                                ? 'bg-[#e5a43b] text-zinc-950 font-bold shadow-sm' 
                                : 'bg-[#0d6efd] text-white font-bold shadow-md shadow-blue-500/20')
                            : (isDark 
                                ? 'bg-[#1c1c1e] border border-zinc-800/80 text-white hover:border-zinc-700' 
                                : 'bg-white border border-zinc-200/80 text-zinc-800 shadow-sm hover:border-zinc-300')
                        }`}
                      >
                        <span className={`text-[11px] font-semibold ${
                          isSelected 
                            ? (isDark ? 'text-zinc-950 font-bold' : 'text-white') 
                            : (isDark ? 'text-zinc-400' : 'text-zinc-600')
                        }`}>
                          {d.weekday}
                        </span>
                        <span className={`text-lg font-extrabold leading-tight mt-0.5 ${
                          isSelected 
                            ? (isDark ? 'text-zinc-950' : 'text-white') 
                            : (isDark ? 'text-white' : 'text-zinc-900')
                        }`}>
                          {d.dayNum}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Day Concluded / Fully Booked Alert */}
                {!hasAvailableSlotsOnSelectedDate && (
                  <div className={`p-4 rounded-2xl border text-center space-y-2 mt-2 ${
                    isDark 
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' 
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}>
                    <div className="flex items-center justify-center gap-2 font-bold text-sm">
                      <Clock className="w-4 h-4 shrink-0 text-amber-500" />
                      <span>All slots for this day have concluded</span>
                    </div>
                    <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      All booking slots for this date have passed or are booked. Please pick an upcoming date to reserve.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const nextDate = dateOptions.find(d => d.iso > selectedDate);
                        if (nextDate) setSelectedDate(nextDate.iso);
                      }}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 ${
                        isDark 
                          ? 'bg-[#e5a43b] text-zinc-950 hover:bg-[#d9982f]' 
                          : 'bg-zinc-900 text-white hover:bg-zinc-800'
                      }`}
                    >
                      <span>View Next Day</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* TIME PERIODS (MORNING / AFTERNOON / EVENING) */}
                <div className="space-y-4 pt-1">
                  {TIME_PERIODS.map(group => (
                    <div key={group.title} className="space-y-2">
                      <span className={`text-xs font-bold uppercase tracking-wider block px-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        {group.title}
                      </span>

                      <div className="grid grid-cols-3 gap-2.5">
                        {group.slots.map(slot => {
                          const isPast = isSlotInPast(selectedDate, slot);
                          const isBooked = bookedSlots.includes(slot);
                          const isUnavailable = isBooked || isPast;
                          const isSelected = selectedTimeSlot === slot && !isUnavailable;
                          const displayTime = formatSlotDisplay(slot);

                          return (
                            <button
                              key={slot}
                              type="button"
                              disabled={isUnavailable}
                              onClick={() => setSelectedTimeSlot(slot)}
                              className={`py-3 px-2 rounded-2xl text-sm font-bold transition-all ${
                                isUnavailable
                                  ? (isDark 
                                      ? 'bg-zinc-900/30 text-zinc-600 border border-zinc-800/40 line-through opacity-35 cursor-not-allowed' 
                                      : 'bg-zinc-100/70 text-zinc-400 border border-zinc-200/60 line-through opacity-40 cursor-not-allowed')
                                  : isSelected
                                  ? (isDark ? 'bg-[#e5a43b] text-zinc-950 shadow-sm font-extrabold' : 'bg-[#0d6efd] text-white shadow-md shadow-blue-500/20 font-extrabold')
                                  : (isDark ? 'bg-[#1c1c1e] border border-zinc-800/80 text-white hover:border-zinc-700' : 'bg-white border border-zinc-200/80 text-zinc-900 hover:border-zinc-300 shadow-sm')
                              }`}
                              title={isPast ? 'This time slot has already passed' : isBooked ? 'This slot is already booked' : slot}
                            >
                              {displayTime}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* STICKY BOTTOM BAR (Date & Time) */}
                <div 
                  style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)' }}
                  className={`fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-xl ${
                    isDark 
                      ? 'bg-zinc-950/95 border-zinc-800 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]' 
                      : 'bg-white/95 border-zinc-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]'
                  }`}
                >
                  <div className="max-w-md mx-auto px-4 pt-3 pb-2 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className={`truncate max-w-[240px] font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        {formattedSelectedDate} {selectedTimeSlot ? `· ${selectedTimeSlot}` : '· Pick a time'}
                      </span>
                      <span className={`font-extrabold text-base ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                        Rs. {(selectedService?.price || 2500).toLocaleString()}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={!selectedTimeSlot || isSlotInPast(selectedDate, selectedTimeSlot) || bookedSlots.includes(selectedTimeSlot)}
                      onClick={() => {
                        if (!selectedTimeSlot || isSlotInPast(selectedDate, selectedTimeSlot) || bookedSlots.includes(selectedTimeSlot)) return;
                        setStep(4);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`w-full py-3.5 rounded-2xl font-bold text-base shadow-md active:scale-[0.98] transition-all ${
                        (!selectedTimeSlot || isSlotInPast(selectedDate, selectedTimeSlot) || bookedSlots.includes(selectedTimeSlot))
                          ? (isDark 
                              ? 'bg-zinc-800/80 text-zinc-500 border border-zinc-700/40 cursor-not-allowed opacity-60' 
                              : 'bg-zinc-200 text-zinc-400 border border-zinc-300 cursor-not-allowed opacity-60')
                          : isDark
                          ? 'bg-[#e5a43b] hover:bg-[#d9982f] text-zinc-950 shadow-[#e5a43b]/15'
                          : 'bg-[#0d6efd] text-white hover:bg-blue-600 shadow-blue-500/20'
                      }`}
                    >
                      {(!selectedTimeSlot || isSlotInPast(selectedDate, selectedTimeSlot) || bookedSlots.includes(selectedTimeSlot))
                        ? 'Select an Available Time'
                        : 'Continue'}
                    </button>
                  </div>
                </div>

              </main>
            )}

            {/* STEP 4: REVIEW & CONFIRM (Claude's Right Mockup) */}
            {step === 4 && (
              <main className="w-full flex-1 px-4 pt-4 pb-36 space-y-4">
                {/* Main Heading */}
                <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  Review & confirm
                </h1>

                {/* Summary Table Card */}
                <div className={`rounded-2xl border overflow-hidden divide-y ${
                  isDark 
                    ? 'bg-[#18181b] border-zinc-800 divide-zinc-800/70' 
                    : 'bg-white border-zinc-200/80 divide-zinc-100 shadow-sm'
                }`}>
                  <div className="px-4 py-3.5 flex items-center justify-between gap-4">
                    <span className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      Service
                    </span>
                    <span className={`text-sm font-bold text-right truncate ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                      {selectedService?.name}
                    </span>
                  </div>

                  <div className="px-4 py-3.5 flex items-center justify-between gap-4">
                    <span className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      Stylist
                    </span>
                    <span className={`text-sm font-bold text-right ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                      {selectedStaff ? selectedStaff.name : 'Any available'}
                    </span>
                  </div>

                  <div className="px-4 py-3.5 flex items-center justify-between gap-4">
                    <span className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      Date
                    </span>
                    <span className={`text-sm font-bold text-right ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                      {formattedSelectedDate}
                    </span>
                  </div>

                  <div className="px-4 py-3.5 flex items-center justify-between gap-4">
                    <span className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      Time
                    </span>
                    <span className={`text-sm font-bold text-right ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                      {selectedTimeSlot} · {selectedService?.durationMinutes} min
                    </span>
                  </div>
                </div>

                {/* Validation Error Message */}
                {formError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* YOUR DETAILS Input Card */}
                <div className="pt-2">
                  <span className={`text-xs font-bold uppercase tracking-wider block px-1 mb-2 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    YOUR DETAILS
                  </span>

                  <div className={`rounded-2xl border overflow-hidden divide-y ${
                    isDark 
                      ? 'bg-[#18181b] border-zinc-800 divide-zinc-800/70' 
                      : 'bg-white border-zinc-200/80 divide-zinc-100 shadow-sm'
                  }`}>
                    {/* Name Row */}
                    <div className="px-4 py-3.5 flex items-center justify-between gap-3">
                      <label className={`text-sm font-semibold shrink-0 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                        Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Required"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className={`w-full text-right text-sm font-semibold bg-transparent outline-none transition-colors ${
                          isDark 
                            ? 'text-white placeholder:text-zinc-500' 
                            : 'text-zinc-900 placeholder:text-zinc-400'
                        }`}
                      />
                    </div>

                    {/* Phone Row */}
                    <div className="px-4 py-3.5 flex items-center justify-between gap-3">
                      <label className={`text-sm font-semibold shrink-0 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                        Phone
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="07x xxx xxxx"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className={`w-full text-right text-sm font-semibold bg-transparent outline-none transition-colors ${
                          isDark 
                            ? 'text-white placeholder:text-zinc-500' 
                            : 'text-zinc-900 placeholder:text-zinc-400'
                        }`}
                      />
                    </div>

                    {/* Optional Notes Row */}
                    <div className="px-4 py-3.5 flex items-center justify-between gap-3">
                      <label className={`text-sm font-semibold shrink-0 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                        Notes
                      </label>
                      <input
                        type="text"
                        placeholder="Optional request"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className={`w-full text-right text-sm font-semibold bg-transparent outline-none transition-colors ${
                          isDark 
                            ? 'text-white placeholder:text-zinc-500' 
                            : 'text-zinc-900 placeholder:text-zinc-400'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* STICKY BOTTOM CONFIRM BAR */}
                <div 
                  style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)' }}
                  className={`fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-xl ${
                    isDark 
                      ? 'bg-zinc-950/95 border-zinc-800 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]' 
                      : 'bg-white/95 border-zinc-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]'
                  }`}
                >
                  <div className="max-w-md mx-auto px-4 pt-3 pb-2 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className={isDark ? 'text-zinc-400' : 'text-zinc-500 font-medium'}>
                        Total
                      </span>
                      <span className={`font-extrabold text-base ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                        Rs. {(selectedService?.price || 2500).toLocaleString()}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleConfirmBooking}
                      className={`w-full py-3.5 rounded-2xl font-bold text-base shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${
                        isDark
                          ? 'bg-[#e5a43b] hover:bg-[#d9982f] text-zinc-950 shadow-[#e5a43b]/15'
                          : 'bg-[#0d6efd] text-white hover:bg-blue-600 shadow-blue-500/20'
                      }`}
                    >
                      {isSubmitting ? 'Confirming...' : 'Confirm booking'}
                    </button>
                  </div>
                </div>

              </main>
            )}

            {/* STEP 5: CONFIRMED DIGITAL PASS */}
            {step === 5 && confirmedBooking && (
              <main className="w-full flex-1 px-4 pt-6 pb-28 space-y-4 text-center animate-fadeIn">
                
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-500 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
                </div>

                <div>
                  <h2 className={`text-2xl font-extrabold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                    Appointment Booked!
                  </h2>
                  <p className={`text-xs mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    Reference #{confirmedBooking.id.slice(0, 8).toUpperCase()}
                  </p>
                </div>

                {/* Digital Ticket Pass */}
                <div className={`p-5 rounded-3xl border text-left space-y-3.5 shadow-xl ${
                  isDark ? 'bg-[#18181b] border-zinc-800' : 'bg-white border-zinc-200/80'
                }`}>
                  <div className={`flex items-center justify-between pb-3 border-b ${
                    isDark ? 'border-zinc-800' : 'border-zinc-200/70'
                  }`}>
                    <div>
                      <span className={`text-[10px] uppercase font-bold block ${isDark ? 'text-[#e5a43b]' : 'text-blue-600'}`}>
                        AQUINESS SALON PASS
                      </span>
                      <h4 className={`font-bold text-base ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                        {confirmedBooking.serviceName}
                      </h4>
                    </div>
                    <QrCode className="w-8 h-8 text-zinc-400 shrink-0" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-zinc-400 block">Client</span>
                      <span className={`font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>{confirmedBooking.customerName}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400 block">Specialist</span>
                      <span className={`font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>{confirmedBooking.staffName}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400 block">Date</span>
                      <span className={`font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>{confirmedBooking.date}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400 block">Time Slot</span>
                      <span className={`font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>{confirmedBooking.timeSlot}</span>
                    </div>
                  </div>

                  <div className={`pt-2 border-t flex items-center justify-between ${
                    isDark ? 'border-zinc-800' : 'border-zinc-200/70'
                  }`}>
                    <span className="text-xs text-zinc-400">Total (Pay at salon)</span>
                    <span className={`text-base font-extrabold ${isDark ? 'text-[#e5a43b]' : 'text-zinc-900'}`}>
                      Rs. {confirmedBooking.servicePrice.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('bookings');
                      setStep(1);
                    }}
                    className={`w-full py-3.5 rounded-2xl font-bold text-sm shadow-md transition-all ${
                      isDark
                        ? 'bg-[#e5a43b] hover:bg-[#d9982f] text-zinc-950 shadow-[#e5a43b]/15'
                        : 'bg-[#0d6efd] text-white hover:bg-blue-600'
                    }`}
                  >
                    View in My Bookings
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setConfirmedBooking(null);
                      setStep(1);
                      setActiveTab('home');
                    }}
                    className={`w-full py-3 rounded-2xl font-bold text-sm border transition-colors ${
                      isDark ? 'bg-[#18181b] border-zinc-800 text-zinc-300 hover:bg-zinc-800' : 'bg-white border-zinc-200 text-zinc-700'
                    }`}
                  >
                    Book Another Session
                  </button>
                </div>

              </main>
            )}

          </div>
        )}

        {/* =========================================================================
            TAB 3: MY BOOKINGS SCREEN
        ========================================================================= */}
        {activeTab === 'bookings' && (
          <div className="flex flex-col w-full animate-fadeIn min-h-screen">
            
            {/* LOCKED TOP HEADER */}
            <header className={`sticky top-0 z-30 w-full backdrop-blur-md border-b app-header-safe-top transition-colors ${
              isDark 
                ? 'bg-zinc-950/90 border-zinc-800/80' 
                : 'bg-[#f0f2f6]/95 border-zinc-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)]'
            }`}>
              <div className="w-full px-4 pt-1.5 pb-2.5">
                <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  My Bookings
                </h1>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Your salon passes & appointments
                </p>
              </div>
            </header>

            {/* SCROLLABLE BOOKINGS LIST */}
            <main className="w-full flex-1 px-4 pt-4 pb-28 space-y-3">
              {myBookings.length === 0 ? (
                <div className={`p-8 rounded-3xl border text-center space-y-3 mt-4 ${
                  isDark ? 'bg-[#18181b] border-zinc-800' : 'bg-white border-zinc-200/80 shadow-sm'
                }`}>
                  <Ticket className="w-10 h-10 text-zinc-400 mx-auto" />
                  <h3 className={`font-bold text-base ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                    No bookings yet
                  </h3>
                  <p className={`text-xs max-w-xs mx-auto ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    When you book an appointment, your digital ticket pass will appear here for easy check-in.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setActiveTab('book');
                    }}
                    className={`py-3 px-6 rounded-2xl font-bold text-sm inline-block mt-2 ${
                      isDark
                        ? 'bg-[#e5a43b] text-zinc-950 font-bold shadow-md shadow-[#e5a43b]/15'
                        : 'bg-[#0d6efd] text-white'
                    }`}
                  >
                    Book your first session
                  </button>
                </div>
              ) : (
                myBookings.map(b => {
                  // Keep status in sync with live appointments
                  const live = appointments.find(a => a.id === b.id) || b;

                  return (
                    <div
                      key={live.id}
                      onClick={() => setViewingPass(live)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.01] ${
                        isDark ? 'bg-[#18181b] border-zinc-800' : 'bg-white border-zinc-200/80 shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize inline-block mb-1.5 ${
                            live.status === 'confirmed'
                              ? 'bg-emerald-500/15 text-emerald-500'
                              : live.status === 'in_progress'
                              ? 'bg-purple-500/15 text-purple-500'
                              : live.status === 'completed'
                              ? 'bg-blue-500/15 text-blue-500'
                              : (isDark ? 'bg-[#e5a43b]/15 text-[#e5a43b]' : 'bg-amber-500/15 text-amber-600')
                          }`}>
                            {live.status.replace('_', ' ')}
                          </span>
                          <h4 className={`font-bold text-base leading-snug truncate ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                            {live.serviceName}
                          </h4>
                          <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                            {live.date} at {live.timeSlot} · {live.staffName}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className={`font-extrabold text-sm block ${isDark ? 'text-[#e5a43b]' : 'text-zinc-900'}`}>
                            Rs. {live.servicePrice.toLocaleString()}
                          </span>
                          <span className={`text-[11px] font-bold mt-1 inline-flex items-center gap-0.5 ${isDark ? 'text-[#e5a43b]' : 'text-[#0d6efd]'}`}>
                            <QrCode className="w-3.5 h-3.5" /> Pass
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </main>

          </div>
        )}

        {/* =========================================================================
            TAB 4: INFO & PROFILE SCREEN (Hours, Location, Theme Toggle, Staff Link)
        ========================================================================= */}
        {activeTab === 'info' && (
          <div className="flex flex-col w-full animate-fadeIn min-h-screen">
            
            {/* LOCKED TOP HEADER */}
            <header className={`sticky top-0 z-30 w-full backdrop-blur-md border-b app-header-safe-top transition-colors ${
              isDark 
                ? 'bg-zinc-950/90 border-zinc-800/80' 
                : 'bg-[#f0f2f6]/95 border-zinc-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)]'
            }`}>
              <div className="w-full px-4 pt-1.5 pb-2.5">
                <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  About Aquiness
                </h1>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Working hours, location, contact & appearance
                </p>
              </div>
            </header>

            {/* SCROLLABLE INFO CONTENT */}
            <main className="w-full flex-1 px-4 pt-4 pb-28 space-y-4">
              
              {/* Brand Card */}
              <div className={`p-4 rounded-3xl border flex items-center gap-3.5 ${
                isDark ? 'bg-[#18181b] border-zinc-800' : 'bg-white border-zinc-200/80 shadow-sm'
              }`}>
                <div 
                  onClick={handleLogoTap}
                  className="relative shrink-0 cursor-pointer select-none active:scale-95 transition-transform"
                  title="Salon Aquiness"
                >
                  <div className="absolute -inset-1 rounded-full blur-sm opacity-80 bg-gradient-to-r from-[#e5a43b] to-[#d9982f] pointer-events-none" />
                  <img
                    src="/logo.png"
                    alt="Aquiness Barber"
                    className="relative w-14 h-14 rounded-full object-cover ring-2 ring-[#e5a43b] shrink-0"
                  />
                </div>
                <div>
                  <h3 className={`font-extrabold text-base ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                    Aquiness Barber
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    Premium Grooming Lounge · Pallewela
                  </p>
                  <div className="flex items-center gap-1 text-xs text-[#e5a43b] font-bold mt-1">
                    <Star className="w-3.5 h-3.5 fill-[#e5a43b] text-[#e5a43b]" />
                    <span>4.95 / 5.0</span>
                    <span className="text-zinc-400 font-normal">· 850+ Happy Clients</span>
                  </div>
                </div>
              </div>

              {/* Theme Switcher Card */}
              <div className={`p-4 rounded-2xl border space-y-2.5 ${
                isDark ? 'bg-[#18181b] border-zinc-800/80' : 'bg-white border-zinc-200/80 shadow-sm'
              }`}>
                <span className={`text-xs font-bold uppercase tracking-wider block ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  APPEARANCE
                </span>
                <div className={`grid grid-cols-2 gap-1.5 p-1 rounded-xl transition-colors ${
                  isDark ? 'bg-zinc-900/90 border border-zinc-800' : 'bg-[#e2e5eb]'
                }`}>
                  <button
                    type="button"
                    onClick={() => {
                      setTheme('dark');
                      try { localStorage.setItem('aquiness_customer_theme', 'dark'); } catch {}
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      isDark 
                        ? 'bg-[#241c10] text-[#e5a43b] shadow-sm border border-[#e5a43b]/30' 
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5 stroke-[2.2]" />
                    <span>Dark & Gold</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTheme('light');
                      try { localStorage.setItem('aquiness_customer_theme', 'light'); } catch {}
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      !isDark 
                        ? 'bg-white text-zinc-900 shadow-sm' 
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5 stroke-[2.2]" />
                    <span>Clean Light</span>
                  </button>
                </div>
              </div>

              {/* REAL OPERATING HOURS */}
              <div className={`p-4 rounded-2xl border space-y-2.5 ${
                isDark ? 'bg-[#18181b] border-zinc-800' : 'bg-white border-zinc-200/80 shadow-sm'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    REAL WORKING HOURS
                  </span>
                  <span className="text-xs font-bold text-emerald-500">
                    {salonStatus.statusText}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  {[
                    { day: 'Monday', hours: '9:00 AM – 8:00 PM', num: 1 },
                    { day: 'Tuesday', hours: '9:00 AM – 8:00 PM', num: 2 },
                    { day: 'Wednesday', hours: '9:00 AM – 8:00 PM', num: 3 },
                    { day: 'Thursday', hours: '9:00 AM – 8:00 PM', num: 4 },
                    { day: 'Friday', hours: '9:00 AM – 8:00 PM', num: 5 },
                    { day: 'Saturday', hours: '8:30 AM – 9:00 PM', num: 6 },
                    { day: 'Sunday', hours: '8:30 AM – 9:00 PM', num: 0 },
                  ].map(item => {
                    const currentSlWeekday = getSriLankaTimeParts().weekday.toLowerCase();
                    const isToday = currentSlWeekday.startsWith(item.day.slice(0, 3).toLowerCase());
                    return (
                      <div 
                        key={item.day}
                        className={`flex items-center justify-between py-1 px-2 rounded-lg ${
                          isToday 
                            ? (isDark ? 'bg-[#241c10] text-[#e5a43b] font-bold' : 'bg-blue-50 text-[#0d6efd] font-bold')
                            : (isDark ? 'text-zinc-300' : 'text-zinc-700')
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          {isToday && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                          {item.day}
                        </span>
                        <span>{item.hours}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* LOCATION & CONTACT */}
              <div className={`p-4 rounded-2xl border space-y-2.5 ${
                isDark ? 'bg-[#18181b] border-zinc-800' : 'bg-white border-zinc-200/80 shadow-sm'
              }`}>
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
                  LOCATION & CONTACT
                </span>
                
                <div className="space-y-2 text-xs">
                  <a
                    href="https://maps.app.goo.gl/XsE4HhDeuy9DzFe67"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 text-zinc-400 hover:underline"
                  >
                    <MapPin className="w-4 h-4 text-[#e5a43b] shrink-0" />
                    <span className={isDark ? 'text-zinc-200' : 'text-zinc-800'}>
                      Salon Aquiness, Kuliyapitiya Madampe Road, Pallewela
                    </span>
                  </a>

                  <a
                    href="tel:+94701333485"
                    className="flex items-center gap-2.5 text-zinc-400 hover:underline"
                  >
                    <Phone className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className={isDark ? 'text-zinc-200' : 'text-zinc-800'}>
                      070 133 3485
                    </span>
                  </a>
                </div>
              </div>

            </main>
          </div>
        )}

        {/* =========================================================================
            CUSTOMER FIXED BOTTOM TAB BAR (Home | Book | Bookings | Profile)
        ========================================================================= */}
        {(activeTab !== 'book' || step === 5) && (
          <nav
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
            className={`fixed bottom-0 left-0 right-0 z-30 border-t backdrop-blur-xl transition-colors ${
              isDark 
                ? 'bg-zinc-950/95 border-zinc-800/90 shadow-2xl shadow-black' 
                : 'bg-white/95 border-zinc-200/90 shadow-lg shadow-black/5'
            }`}
          >
            <div className="w-full max-w-md mx-auto grid grid-cols-4 py-2 px-2 text-center select-none">
              
              {/* 1. Home */}
              <button
                type="button"
                onClick={() => setActiveTab('home')}
                className={`flex flex-col items-center justify-center py-1 rounded-xl transition-colors ${
                  activeTab === 'home'
                    ? (isDark ? 'text-[#e5a43b]' : 'text-[#0d6efd]')
                    : (isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-500 hover:text-zinc-800')
                }`}
              >
                <HomeIcon className="w-5 h-5 stroke-[2.2]" />
                <span className={`text-[11px] mt-1 ${activeTab === 'home' ? 'font-bold' : 'font-medium'}`}>
                  Home
                </span>
              </button>

              {/* 2. Book */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('book');
                  setStep(1);
                }}
                className={`flex flex-col items-center justify-center py-1 rounded-xl transition-colors ${
                  activeTab === 'book'
                    ? (isDark ? 'text-[#e5a43b]' : 'text-[#0d6efd]')
                    : (isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-500 hover:text-zinc-800')
                }`}
              >
                <CalendarIcon className="w-5 h-5 stroke-[2.2]" />
                <span className={`text-[11px] mt-1 ${activeTab === 'book' ? 'font-bold' : 'font-medium'}`}>
                  Book
                </span>
              </button>

              {/* 3. Bookings */}
              <button
                type="button"
                onClick={() => setActiveTab('bookings')}
                className={`flex flex-col items-center justify-center py-1 rounded-xl transition-colors relative ${
                  activeTab === 'bookings'
                    ? (isDark ? 'text-[#e5a43b]' : 'text-[#0d6efd]')
                    : (isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-500 hover:text-zinc-800')
                }`}
              >
                <Ticket className="w-5 h-5 stroke-[2.2]" />
                <span className={`text-[11px] mt-1 ${activeTab === 'bookings' ? 'font-bold' : 'font-medium'}`}>
                  Bookings
                </span>
                {myBookings.length > 0 && (
                  <span className={`absolute top-1 right-5 w-2 h-2 rounded-full ${isDark ? 'bg-[#e5a43b]' : 'bg-[#0d6efd]'}`} />
                )}
              </button>

              {/* 4. About Salon */}
              <button
                type="button"
                onClick={() => setActiveTab('info')}
                className={`flex flex-col items-center justify-center py-1 rounded-xl transition-colors ${
                  activeTab === 'info'
                    ? (isDark ? 'text-[#e5a43b]' : 'text-[#0d6efd]')
                    : (isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-500 hover:text-zinc-800')
                }`}
              >
                <Info className="w-5 h-5 stroke-[2.2]" />
                <span className={`text-[11px] mt-1 ${activeTab === 'info' ? 'font-bold' : 'font-medium'}`}>
                  About
                </span>
              </button>

            </div>
          </nav>
        )}

        {/* MODAL: VIEW SAVED PASS WITH QR */}
        {viewingPass && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
            <div 
              style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 20px)' }}
              className={`w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-2xl ${
                isDark ? 'bg-[#18181b] text-white border border-zinc-800' : 'bg-white text-zinc-900'
              }`}
            >
              <div className={`flex items-center justify-between pb-3 border-b ${
                isDark ? 'border-zinc-800' : 'border-zinc-200'
              }`}>
                <span className={`text-xs uppercase font-extrabold ${isDark ? 'text-[#e5a43b]' : 'text-blue-600'}`}>
                  APPOINTMENT PASS
                </span>
                <span className="text-xs font-bold text-zinc-400">
                  #{viewingPass.id.slice(0, 8).toUpperCase()}
                </span>
              </div>

              <div className="text-center py-2 space-y-1">
                <QrCode className={`w-24 h-24 mx-auto ${isDark ? 'text-[#e5a43b]' : 'text-[#0d6efd]'}`} />
                <p className="text-xs text-zinc-400">Present this QR upon arrival at salon</p>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className={`flex justify-between py-1 border-b ${
                  isDark ? 'border-zinc-800/80' : 'border-zinc-100'
                }`}>
                  <span className="text-zinc-400">Service</span>
                  <span className="font-bold">{viewingPass.serviceName}</span>
                </div>
                <div className={`flex justify-between py-1 border-b ${
                  isDark ? 'border-zinc-800/80' : 'border-zinc-100'
                }`}>
                  <span className="text-zinc-400">Specialist</span>
                  <span className="font-bold">{viewingPass.staffName}</span>
                </div>
                <div className={`flex justify-between py-1 border-b ${
                  isDark ? 'border-zinc-800/80' : 'border-zinc-100'
                }`}>
                  <span className="text-zinc-400">Date & Time</span>
                  <span className="font-bold">{viewingPass.date} · {viewingPass.timeSlot}</span>
                </div>
                <div className={`flex justify-between py-1 border-b ${
                  isDark ? 'border-zinc-800/80' : 'border-zinc-100'
                }`}>
                  <span className="text-zinc-400">Status</span>
                  <span className="font-bold uppercase text-emerald-500">{viewingPass.status}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-zinc-400">Total</span>
                  <span className={`font-extrabold text-sm ${isDark ? 'text-[#e5a43b]' : 'text-zinc-900'}`}>Rs. {viewingPass.servicePrice.toLocaleString()}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingPass(null)}
                className={`w-full py-3 rounded-xl font-bold text-sm ${
                  isDark ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-800'
                }`}
              >
                Close Pass
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
