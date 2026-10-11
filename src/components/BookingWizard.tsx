import React, { useState, useMemo } from 'react';
import { 
  Scissors, User, Calendar as CalendarIcon, Clock, Check, 
  Sparkles, ChevronRight, ChevronLeft, Search, Star, Phone,
  Mail, MessageSquare, AlertCircle, CheckCircle2, QrCode
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { SalonService, StaffMember, ServiceCategory, Appointment } from '../types';
import { TIME_SLOTS } from '../data/mockData';
import { StorageService } from '../services/storage';

interface BookingWizardProps {
  services: SalonService[];
  staff: StaffMember[];
  appointments: Appointment[];
  onAppointmentCreated: (appointment: Appointment) => void;
  onGoToStaffPortal: () => void;
}

export const BookingWizard: React.FC<BookingWizardProps> = ({
  services,
  staff,
  appointments,
  onAppointmentCreated,
  onGoToStaffPortal
}) => {
  // Steps: 1 = Service, 2 = Stylist, 3 = Date & Time, 4 = Contact Info, 5 = Confirmed Pass
  const [step, setStep] = useState<number>(1);

  // Form State
  const [selectedService, setSelectedService] = useState<SalonService | null>(services[0] || null);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null); // null means "Any Available"
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('10:30 AM');
  
  // Client details
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [formError, setFormError] = useState<string>('');

  // Service filter state
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Confirmed appointment result
  const [confirmedBooking, setConfirmedBooking] = useState<Appointment | null>(null);

  // Dynamic next 14 days
  const dateOptions = useMemo(() => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
      const month = d.toLocaleDateString('en-US', { month: 'short' });
      const dayNum = d.getDate();
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

  // Filtered services
  const filteredServices = useMemo(() => {
    return services.filter(srv => {
      const matchCat = categoryFilter === 'All' || srv.category === categoryFilter;
      const matchSearch = srv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          srv.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [services, categoryFilter, searchQuery]);

  // Booked slots for selected date & staff
  const bookedSlots = useMemo(() => {
    return appointments
      .filter(apt => apt.date === selectedDate && apt.status !== 'cancelled')
      .filter(apt => !selectedStaff || apt.staffId === selectedStaff.id || apt.staffId === 'any')
      .map(apt => apt.timeSlot);
  }, [appointments, selectedDate, selectedStaff]);

  const categories: (ServiceCategory | 'All')[] = [
    'All',
    'Hair',
    'Beard & Shave',
    'Facials & Skin',
    'Spa & Treatments',
    'VIP Packages'
  ];

  const handleConfirmBooking = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!selectedService) {
      setFormError('Please select a service');
      setStep(1);
      return;
    }

    if (!customerName.trim()) {
      setFormError('Please enter your full name');
      return;
    }

    if (!customerPhone.trim() || customerPhone.replace(/\D/g, '').length < 8) {
      setFormError('Please enter a valid phone number (e.g., 077 123 4567)');
      return;
    }

    const assignedStaff = selectedStaff || staff[0];

    const newApt = StorageService.createAppointment({
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
      status: 'pending',
      notes: notes.trim() || undefined
    });

    setConfirmedBooking(newApt);
    onAppointmentCreated(newApt);
    setStep(5);

    // Confetti celebration
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {
      // Ignore if unsupported in environment
    }
  };

  const resetBookingForm = () => {
    setConfirmedBooking(null);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setNotes('');
    setStep(1);
  };

  return (
    <div id="booking-section" className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      
      {/* Step Progress Bar (hidden on confirmation screen) */}
      {step < 5 && (
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-2xl mx-auto mb-3">
            {[
              { num: 1, label: 'Service' },
              { num: 2, label: 'Specialist' },
              { num: 3, label: 'Schedule' },
              { num: 4, label: 'Your Details' },
            ].map(s => {
              const isPassed = step > s.num;
              const isCurrent = step === s.num;
              return (
                <div 
                  key={s.num} 
                  onClick={() => s.num < step && setStep(s.num)}
                  className={`flex items-center gap-2 cursor-pointer ${isCurrent ? 'text-amber-400 font-semibold' : isPassed ? 'text-zinc-300' : 'text-zinc-600'}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isCurrent 
                      ? 'bg-amber-500 text-zinc-950 ring-4 ring-amber-500/20' 
                      : isPassed 
                        ? 'bg-zinc-800 text-amber-400 border border-amber-500/40' 
                        : 'bg-zinc-900 text-zinc-600 border border-zinc-800'
                  }`}>
                    {isPassed ? <Check className="w-4 h-4" /> : s.num}
                  </div>
                  <span className="text-xs sm:text-sm hidden sm:inline">{s.label}</span>
                </div>
              );
            })}
          </div>

          <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden max-w-2xl mx-auto">
            <div 
              className="bg-gradient-to-r from-amber-500 to-amber-400 h-full transition-all duration-300"
              style={{ width: `${((step - 1) / 3) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* STEP 1: SERVICE SELECTION */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="text-center sm:text-left">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white">Choose Your Salon Service</h2>
            <p className="text-zinc-400 text-sm mt-1">Select from our signature grooming packages and therapies.</p>
          </div>

          {/* Category Tabs & Search */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    categoryFilter === cat
                      ? 'bg-amber-500 text-zinc-950 font-semibold'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search haircuts, beard, spa..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full sm:w-60 pl-9 pr-3.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredServices.map(service => {
              const isSelected = selectedService?.id === service.id;
              return (
                <div
                  key={service.id}
                  onClick={() => setSelectedService(service)}
                  className={`relative p-5 rounded-xl border text-left cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'bg-zinc-900/90 border-amber-500/80 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/40'
                      : 'bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/60'
                  }`}
                >
                  {service.popular && (
                    <span className="absolute top-4 right-4 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      Popular
                    </span>
                  )}

                  <div className="flex items-start justify-between pr-14">
                    <div>
                      <span className="text-[11px] font-medium text-amber-400/90 uppercase tracking-wider">
                        {service.category}
                      </span>
                      <h3 className="text-base font-semibold text-white mt-0.5">
                        {service.name}
                      </h3>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                    {service.description}
                  </p>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-800/60">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <Clock className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{service.durationMinutes} mins</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-serif font-bold text-base text-amber-400">
                        Rs. {service.price.toLocaleString()}
                      </span>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                        isSelected ? 'bg-amber-500 text-zinc-950 font-bold' : 'border border-zinc-700 text-transparent'
                      }`}>
                        ✓
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => {
                if (selectedService) setStep(2);
              }}
              disabled={!selectedService}
              className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-sm disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              <span>Continue to Specialist</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: SPECIALIST SELECTION */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white">Select Your Barber or Stylist</h2>
              <p className="text-zinc-400 text-sm mt-1">Pick your preferred stylist or select any available team member.</p>
            </div>
            <button
              onClick={() => setStep(1)}
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Any Available Option */}
            <div
              onClick={() => setSelectedStaff(null)}
              className={`p-5 rounded-xl border cursor-pointer transition-all ${
                selectedStaff === null
                  ? 'bg-zinc-900/90 border-amber-500/80 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/40'
                  : 'bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400/20 to-amber-600/30 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-base">First Available Master</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Recommended for quickest appointment time slot.</p>
                  <span className="inline-block mt-2 text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                    Fastest Booking
                  </span>
                </div>
              </div>
            </div>

            {/* Individual Specialists */}
            {staff.map(member => {
              const isSelected = selectedStaff?.id === member.id;
              return (
                <div
                  key={member.id}
                  onClick={() => setSelectedStaff(member)}
                  className={`p-5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-zinc-900/90 border-amber-500/80 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/40'
                      : 'bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-zinc-700"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-white text-base">{member.name}</h3>
                        <div className="flex items-center gap-1 text-xs text-amber-400">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          <span className="font-semibold">{member.rating}</span>
                        </div>
                      </div>
                      <p className="text-xs text-amber-400/90 font-medium">{member.role}</p>
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-1">{member.specialty}</p>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          member.available ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/15 text-red-400'
                        }`}>
                          {member.available ? 'Available Today' : 'Off-duty'}
                        </span>
                        <span className="text-[11px] text-zinc-500">{member.reviewsCount} reviews</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => setStep(1)}
              className="px-5 py-2.5 rounded-xl text-xs text-zinc-400 hover:text-white transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-sm transition-colors flex items-center gap-2"
            >
              <span>Continue to Schedule</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: DATE & TIME SELECTION */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white">Select Date & Time Slot</h2>
              <p className="text-zinc-400 text-sm mt-1">Pick a convenient session time for your salon visit.</p>
            </div>
            <button
              onClick={() => setStep(2)}
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          </div>

          {/* Date Picker Strip */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              Select Date (Next 14 Days)
            </label>
            <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
              {dateOptions.map(d => {
                const isSelected = selectedDate === d.iso;
                return (
                  <button
                    key={d.iso}
                    onClick={() => setSelectedDate(d.iso)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl min-w-[76px] transition-all border ${
                      isSelected
                        ? 'bg-amber-500 text-zinc-950 font-bold border-amber-400 shadow-lg shadow-amber-500/20 scale-105'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
                    }`}
                  >
                    <span className="text-[11px] uppercase tracking-wider">
                      {d.isToday ? 'Today' : d.isTomorrow ? 'Tmrw' : d.weekday}
                    </span>
                    <span className="text-lg font-serif font-bold my-0.5">{d.dayNum}</span>
                    <span className="text-[10px]">{d.month}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Slots */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Available Time Slots ({selectedTimeSlot})
              </label>
              <span className="text-xs text-zinc-500">
                Duration: ~{selectedService?.durationMinutes} mins
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
              {TIME_SLOTS.map(slot => {
                const isBooked = bookedSlots.includes(slot);
                const isSelected = selectedTimeSlot === slot;
                return (
                  <button
                    key={slot}
                    disabled={isBooked}
                    onClick={() => setSelectedTimeSlot(slot)}
                    className={`p-2.5 rounded-xl text-xs font-medium border text-center transition-all ${
                      isBooked
                        ? 'bg-zinc-900/30 text-zinc-600 border-zinc-900 line-through cursor-not-allowed'
                        : isSelected
                          ? 'bg-amber-500 text-zinc-950 font-bold border-amber-400 shadow-md shadow-amber-500/20'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-amber-500/50 hover:text-white'
                    }`}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selection Recap Box */}
          <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs text-zinc-400">Summary:</p>
              <p className="text-sm font-semibold text-white">
                {selectedService?.name} with <span className="text-amber-400">{selectedStaff?.name || 'Any Master Stylist'}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-400">Date & Slot:</p>
              <p className="text-sm font-semibold text-white">
                {selectedDate} at <span className="text-amber-400">{selectedTimeSlot}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => setStep(2)}
              className="px-5 py-2.5 rounded-xl text-xs text-zinc-400 hover:text-white transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep(4)}
              className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-sm transition-colors flex items-center gap-2"
            >
              <span>Continue to Contact Info</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: CLIENT CONTACT INFO */}
      {step === 4 && (
        <div className="space-y-6 max-w-xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white">Your Contact Details</h2>
              <p className="text-zinc-400 text-sm mt-1">We'll reserve your slot and send instant confirmation.</p>
            </div>
            <button
              onClick={() => setStep(3)}
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          </div>

          {formError && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleConfirmBooking} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Full Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Kasun Fernando"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Mobile Number * (for WhatsApp/SMS confirmation)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  placeholder="e.g. 077 123 4567"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Email Address (Optional)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  placeholder="e.g. kasun@example.com"
                  value={customerEmail}
                  onChange={e => setCustomerEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Special Requests or Notes (Optional)
              </label>
              <div className="relative">
                <MessageSquare className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                <textarea
                  rows={2}
                  placeholder="e.g. skin sensitivity, specific beard line, etc."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-2">
              <div className="flex justify-between text-xs text-zinc-400">
                <span>{selectedService?.name}</span>
                <span>Rs. {selectedService?.price.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-zinc-400">
                <span>Booking Reservation Fee</span>
                <span className="text-emerald-400">FREE</span>
              </div>
              <div className="pt-2 border-t border-zinc-800 flex justify-between font-semibold text-sm text-white">
                <span>Total Due at Salon</span>
                <span className="text-amber-400 font-serif font-bold text-base">
                  Rs. {selectedService?.price.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-5 py-2.5 rounded-xl text-xs text-zinc-400 hover:text-white transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                className="px-7 py-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-zinc-950 font-bold text-sm shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.01] transition-all flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm Reservation</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 5: BOOKING CONFIRMATION PASS / TICKET */}
      {step === 5 && confirmedBooking && (
        <div className="max-w-md mx-auto space-y-6 text-center animate-fade-in">
          
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-2">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h2 className="font-serif text-3xl font-bold text-white">Appointment Reserved!</h2>
            <p className="text-xs text-zinc-400 mt-1">
              Thank you, {confirmedBooking.customerName}. We look forward to pampering you.
            </p>
          </div>

          {/* Luxury Salon Boarding Pass Ticket */}
          <div className="rounded-2xl bg-zinc-900 border border-amber-500/30 overflow-hidden shadow-2xl relative text-left">
            <div className="p-5 bg-gradient-to-r from-zinc-900 to-zinc-950 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400">
                  Saloon Aquiness & Spa
                </span>
                <p className="font-serif font-bold text-white text-base">VIP Reservation Pass</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-zinc-400">Pass Code</span>
                <p className="font-mono text-xs font-bold text-amber-400">#{confirmedBooking.id.substring(4, 10).toUpperCase()}</p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-zinc-500 block">Client</span>
                  <span className="font-medium text-white">{confirmedBooking.customerName}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Phone</span>
                  <span className="font-medium text-white">{confirmedBooking.customerPhone}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-zinc-500 block">Date</span>
                  <span className="font-medium text-amber-400">{confirmedBooking.date}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Time Slot</span>
                  <span className="font-medium text-amber-400">{confirmedBooking.timeSlot}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800 text-xs">
                <span className="text-zinc-500 block">Service & Specialist</span>
                <p className="font-medium text-white text-sm mt-0.5">{confirmedBooking.serviceName}</p>
                <p className="text-zinc-400 text-xs mt-0.5">Stylist: {confirmedBooking.staffName}</p>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-zinc-500 text-xs block">Estimated Amount</span>
                  <span className="font-serif font-bold text-base text-white">Rs. {confirmedBooking.servicePrice.toLocaleString()}</span>
                </div>
                <div className="p-2 bg-white rounded-lg">
                  <QrCode className="w-8 h-8 text-zinc-950" />
                </div>
              </div>
            </div>

            <div className="p-3 bg-zinc-950/80 border-t border-zinc-800/80 text-center">
              <p className="text-[11px] text-zinc-400">
                Show this voucher or phone number when you arrive at our salon.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={resetBookingForm}
              className="flex-1 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-800 transition-colors"
            >
              Book Another Appointment
            </button>
            <button
              onClick={onGoToStaffPortal}
              className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition-colors shadow-md shadow-amber-500/20"
            >
              View in Staff Dashboard →
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
