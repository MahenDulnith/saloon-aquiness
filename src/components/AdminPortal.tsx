import React, { useState, useMemo } from 'react';
import { 
  Calendar, CheckCircle, Clock, XCircle, 
  Search, Plus, Trash2, Phone, 
  DollarSign, Users, Scissors, Check, Sparkles, Lock,
  Crown, LogOut, UserCheck, Menu, X, Globe, ArrowLeft,
  BarChart3, TrendingUp, Award, ArrowRight
} from 'lucide-react';
import { Appointment, SalonService, StaffMember, AppointmentStatus, ServiceCategory, CurrentStaffUser } from '../types';
import { StorageService } from '../services/storage';

interface AdminPortalProps {
  currentUser: CurrentStaffUser;
  appointments: Appointment[];
  services: SalonService[];
  staff: StaffMember[];
  onAppointmentsUpdated: () => void;
  onServicesUpdated: () => void;
  onStaffUpdated: () => void;
  onExitToClientWebsite?: () => void;
  onLockPortal?: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  currentUser,
  appointments,
  services,
  staff,
  onAppointmentsUpdated,
  onServicesUpdated,
  onStaffUpdated,
  onExitToClientWebsite,
  onLockPortal
}) => {
  const [activeTab, setActiveTab] = useState<'appointments' | 'reports' | 'services' | 'staff'>('appointments');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('all'); // 'all' or 'today'
  const [stylistScope, setStylistScope] = useState<'all' | 'mine'>('all');
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  // Service form state (Admin only)
  const [showAddServiceModal, setShowAddServiceModal] = useState<boolean>(false);
  const [newServiceName, setNewServiceName] = useState<string>('');
  const [newServiceCategory, setNewServiceCategory] = useState<ServiceCategory>('Hair');
  const [newServicePrice, setNewServicePrice] = useState<number>(2000);
  const [newServiceDuration, setNewServiceDuration] = useState<number>(30);
  const [newServiceDescription, setNewServiceDescription] = useState<string>('');

  const todayIso = new Date().toISOString().split('T')[0];
  const isAdmin = currentUser.role === 'admin';

  // Stats calculation
  const stats = useMemo(() => {
    const total = appointments.length;
    const pending = appointments.filter(a => a.status === 'pending').length;
    const confirmed = appointments.filter(a => a.status === 'confirmed').length;
    const inChair = appointments.filter(a => a.status === 'in_progress').length;
    const completed = appointments.filter(a => a.status === 'completed').length;
    const todayAppointments = appointments.filter(a => a.date === todayIso && a.status !== 'cancelled');
    const todayCount = todayAppointments.length;
    
    const totalRevenue = appointments
      .filter(a => a.status === 'completed' || a.status === 'confirmed')
      .reduce((sum, a) => sum + a.servicePrice, 0);

    const todayRevenue = todayAppointments
      .filter(a => a.status === 'completed' || a.status === 'confirmed')
      .reduce((sum, a) => sum + a.servicePrice, 0);

    const avgTicket = total > 0 ? Math.round(totalRevenue / (completed + confirmed || 1)) : 0;

    return { total, pending, confirmed, inChair, completed, todayCount, totalRevenue, todayRevenue, avgTicket };
  }, [appointments, todayIso]);

  // Analytics for the full reports dashboard
  const reportData = useMemo(() => {
    // Stylist performance breakdown
    const stylistBreakdown = staff.map(st => {
      const staffApts = appointments.filter(a => 
        a.staffId === st.id || 
        a.staffName.toLowerCase().includes(st.name.toLowerCase())
      );
      const completedCount = staffApts.filter(a => a.status === 'completed').length;
      const totalEarned = staffApts
        .filter(a => a.status === 'completed' || a.status === 'confirmed')
        .reduce((sum, a) => sum + a.servicePrice, 0);

      return {
        id: st.id,
        name: st.name,
        role: st.role,
        avatar: st.avatar,
        appointmentsCount: staffApts.length,
        completedCount,
        revenue: totalEarned
      };
    });

    // Category breakdown
    const categories: Record<string, { count: number; revenue: number }> = {};
    appointments.forEach(apt => {
      const cat = services.find(s => s.id === apt.serviceId)?.category || 'General';
      if (!categories[cat]) categories[cat] = { count: 0, revenue: 0 };
      categories[cat].count += 1;
      if (apt.status === 'completed' || apt.status === 'confirmed') {
        categories[cat].revenue += apt.servicePrice;
      }
    });

    return { stylistBreakdown, categories };
  }, [appointments, staff, services]);

  // Filtered appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter(apt => {
      const matchStatus = statusFilter === 'all' || apt.status === statusFilter;
      const matchDate = dateFilter === 'all' || (dateFilter === 'today' && apt.date === todayIso);
      
      const matchStylistScope = stylistScope === 'all' || (
        apt.staffId === currentUser.id || 
        apt.staffName.toLowerCase().includes(currentUser.name.toLowerCase()) ||
        currentUser.name.toLowerCase().includes(apt.staffName.toLowerCase())
      );

      const matchSearch = 
        apt.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        apt.customerPhone.includes(searchQuery) ||
        apt.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        apt.staffName.toLowerCase().includes(searchQuery.toLowerCase());

      return matchStatus && matchDate && matchStylistScope && matchSearch;
    });
  }, [appointments, statusFilter, dateFilter, stylistScope, currentUser, searchQuery, todayIso]);

  // Status badge styling
  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <CheckCircle className="w-3 h-3" /> Confirmed
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/30 animate-pulse">
            <Sparkles className="w-3 h-3" /> In Chair
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <Check className="w-3 h-3" /> Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
            <XCircle className="w-3 h-3" /> Cancelled
          </span>
        );
    }
  };

  // Distinct border & tint for appointment cards based on status
  const getStatusCardStyle = (status: AppointmentStatus) => {
    switch (status) {
      case 'pending':
        return 'border-l-4 border-l-amber-400 bg-amber-500/[0.03]';
      case 'confirmed':
        return 'border-l-4 border-l-blue-400 bg-blue-500/[0.03]';
      case 'in_progress':
        return 'border-l-4 border-l-purple-400 bg-purple-500/[0.04] shadow-md shadow-purple-500/5';
      case 'completed':
        return 'border-l-4 border-l-emerald-400 bg-emerald-500/[0.03]';
      case 'cancelled':
        return 'border-l-4 border-l-zinc-700 bg-zinc-900/40 opacity-70';
    }
  };

  const handleUpdateStatus = (id: string, status: AppointmentStatus) => {
    StorageService.updateAppointmentStatus(id, status);
    onAppointmentsUpdated();
  };

  const handleDeleteAppointment = (id: string) => {
    if (window.confirm('Delete this appointment record?')) {
      StorageService.deleteAppointment(id);
      onAppointmentsUpdated();
    }
  };

  const handleToggleStaff = (id: string) => {
    StorageService.toggleStaffAvailability(id);
    onStaffUpdated();
  };

  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Only Admin (Didula) can add services.');
      return;
    }

    if (!newServiceName.trim()) return;

    const newSrv: SalonService = {
      id: `srv-${Date.now().toString(36)}`,
      name: newServiceName.trim(),
      category: newServiceCategory,
      price: Number(newServicePrice) || 1500,
      durationMinutes: Number(newServiceDuration) || 30,
      description: newServiceDescription.trim() || 'Custom salon service package.',
      popular: false
    };

    StorageService.addOrUpdateService(newSrv);
    onServicesUpdated();
    setShowAddServiceModal(false);
    setNewServiceName('');
    setNewServiceDescription('');
  };

  const handleDeleteService = (id: string) => {
    if (!isAdmin) {
      alert('Only Admin (Didula) can delete services.');
      return;
    }

    if (window.confirm('Delete this service from the salon catalog?')) {
      StorageService.deleteService(id);
      onServicesUpdated();
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      
      {/* NATIVE APP TOP BAR (Sticky, Minimal) */}
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/80 px-4 sm:px-6 h-16 flex items-center justify-between">
        
        {/* Left: User Profile & Title */}
        <div className="flex items-center gap-3">
          <div className="relative">
            {currentUser.avatar ? (
              <img 
                src={currentUser.avatar} 
                alt={currentUser.name} 
                className="w-9 h-9 rounded-full object-cover ring-2 ring-amber-500/50"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-sm ring-1 ring-amber-500/40">
                {currentUser.name.charAt(0)}
              </div>
            )}
            {isAdmin && (
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center text-[9px] font-bold shadow">
                <Crown className="w-2.5 h-2.5" />
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white text-sm sm:text-base leading-none">
                {currentUser.name.split(' ')[0]}
              </span>
              {isAdmin ? (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  Admin
                </span>
              ) : (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/40">
                  Stylist
                </span>
              )}
            </div>
            <span className="text-[11px] text-zinc-400 capitalize">
              {activeTab === 'appointments' ? 'Queue & Schedule' : activeTab === 'reports' ? 'Reports & Analytics' : activeTab === 'services' ? 'Services' : 'Staff Roster'}
            </span>
          </div>
        </div>

        {/* Right: Quick Context Actions & Hamburger Menu Button */}
        <div className="flex items-center gap-2">
          {activeTab === 'services' && isAdmin && (
            <button
              onClick={() => setShowAddServiceModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs shadow-md shadow-amber-500/20 hover:bg-amber-400 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Service</span>
            </button>
          )}

          {activeTab !== 'appointments' && (
            <button
              onClick={() => setActiveTab('appointments')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Queue</span>
            </button>
          )}

          {/* HAMBURGER MENU BUTTON */}
          <button
            onClick={() => setIsMenuOpen(true)}
            className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-amber-500/40 transition-colors active:scale-95"
            aria-label="Open Navigation Menu"
            title="Menu"
          >
            <Menu className="w-5 h-5 text-amber-400" />
          </button>
        </div>
      </header>

      {/* SLIDE-OUT HAMBURGER MENU DRAWER */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end animate-fade-in">
          {/* Backdrop */}
          <div 
            onClick={() => setIsMenuOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
          />

          {/* Drawer Content */}
          <div className="relative w-72 sm:w-80 bg-zinc-900 border-l border-zinc-800 h-full p-6 flex flex-col justify-between shadow-2xl z-10 animate-slide-left">
            
            <div className="space-y-6">
              {/* Drawer Top / Header */}
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <img 
                    src="/logo.png" 
                    alt="Saloon Aquiness" 
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-amber-500/40" 
                  />
                  <div>
                    <span className="font-serif font-bold text-white text-base tracking-wide block">
                      AQUINESS BARBER
                    </span>
                    <span className="text-[10px] text-amber-400 uppercase font-semibold">Staff App</span>
                  </div>
                </div>

                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Current User Chip */}
              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center gap-3">
                <img 
                  src={currentUser.avatar} 
                  alt={currentUser.name} 
                  className="w-10 h-10 rounded-full object-cover ring-1 ring-amber-500/50 shrink-0" 
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
                  <p className="text-[11px] text-amber-400 flex items-center gap-1">
                    {isAdmin ? <Crown className="w-3 h-3" /> : <Scissors className="w-3 h-3" />}
                    <span>{isAdmin ? 'Salon Owner / Admin' : 'Stylist'}</span>
                  </p>
                </div>
              </div>

              {/* Menu Navigation Links */}
              <nav className="space-y-1.5 text-xs font-semibold">
                <button
                  onClick={() => {
                    setActiveTab('appointments');
                    setIsMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all ${
                    activeTab === 'appointments'
                      ? 'bg-amber-500 text-zinc-950 shadow-md font-bold'
                      : 'text-zinc-300 hover:text-white hover:bg-zinc-800/80'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>Appointments & Queue</span>
                  <span className="ml-auto text-[11px] opacity-80">{appointments.length}</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('reports');
                    setIsMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all ${
                    activeTab === 'reports'
                      ? 'bg-amber-500 text-zinc-950 shadow-md font-bold'
                      : 'text-zinc-300 hover:text-white hover:bg-zinc-800/80'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Reports & Financials</span>
                  <span className="ml-auto text-[11px] text-amber-400 font-mono">Rs. {stats.totalRevenue.toLocaleString()}</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('services');
                    setIsMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all ${
                    activeTab === 'services'
                      ? 'bg-amber-500 text-zinc-950 shadow-md font-bold'
                      : 'text-zinc-300 hover:text-white hover:bg-zinc-800/80'
                  }`}
                >
                  <Scissors className="w-4 h-4" />
                  <span>Services & Pricing</span>
                  <span className="ml-auto text-[11px] opacity-80">{services.length}</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('staff');
                    setIsMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all ${
                    activeTab === 'staff'
                      ? 'bg-amber-500 text-zinc-950 shadow-md font-bold'
                      : 'text-zinc-300 hover:text-white hover:bg-zinc-800/80'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Staff Roster & Shifts</span>
                  <span className="ml-auto text-[11px] opacity-80">{staff.length}</span>
                </button>
              </nav>

              <div className="pt-2 border-t border-zinc-800/80 space-y-1.5 text-xs">
                {/* Switch to Client Website */}
                {onExitToClientWebsite && (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onExitToClientWebsite();
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition-colors"
                  >
                    <Globe className="w-4 h-4 text-amber-400" />
                    <span>View Client Booking Website</span>
                  </button>
                )}

                {/* Logout / Switch Staff */}
                {onLockPortal && (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onLockPortal();
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Lock Portal / Switch User</span>
                  </button>
                )}
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="pt-4 border-t border-zinc-800 text-[11px] text-zinc-500 flex items-center justify-between">
              <span>Saloon Aquiness PWA</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Sync
              </span>
            </div>

          </div>
        </div>
      )}

      {/* MAIN SCREEN BODY */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-3 sm:py-5 space-y-4">
        
        {/* VIEW 1: APPOINTMENTS & QUEUE (MAIN WORKSPACE) */}
        {activeTab === 'appointments' && (
          <div className="space-y-4">
            
            {/* SECTION 1: DISTINCT REPORT DASHBOARD MODULE (Visual separation from bookings) */}
            <section className="rounded-2xl bg-gradient-to-b from-zinc-900/90 to-zinc-950 border border-zinc-800 p-3.5 sm:p-4 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <BarChart3 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white tracking-wide uppercase">
                      Today's Salon Performance
                    </span>
                    <span className="text-[10px] text-zinc-400 block">
                      Live metrics for today ({todayIso})
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('reports')}
                  className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/20 transition-all"
                >
                  <span>Full Analytics</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* 4 Colored Accent Metric Tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
                {/* Pending */}
                <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-amber-500/20 hover:border-amber-500/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400 font-medium">Pending Requests</span>
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <p className="text-xl font-bold text-amber-400 mt-1">{stats.pending}</p>
                  <span className="text-[10px] text-zinc-500 block">Requires confirmation</span>
                </div>

                {/* Today */}
                <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-blue-500/20 hover:border-blue-500/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400 font-medium">Today's Schedule</span>
                    <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <p className="text-xl font-bold text-blue-400 mt-1">{stats.todayCount}</p>
                  <span className="text-[10px] text-zinc-500 block">Booked clients</span>
                </div>

                {/* In Chair */}
                <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-purple-500/20 hover:border-purple-500/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400 font-medium">Active in Chair</span>
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                  <p className="text-xl font-bold text-purple-400 mt-1">{stats.inChair}</p>
                  <span className="text-[10px] text-zinc-500 block">In service now</span>
                </div>

                {/* Revenue */}
                <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-emerald-500/20 hover:border-emerald-500/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400 font-medium">Salon Revenue</span>
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <p className="text-base sm:text-lg font-bold text-emerald-400 mt-1 truncate">
                    Rs. {stats.totalRevenue.toLocaleString()}
                  </p>
                  <span className="text-[10px] text-zinc-500 block">Confirmed & done</span>
                </div>
              </div>
            </section>

            {/* SECTION 2: DISTINCT CLIENT QUEUE & BOOKING SECTION */}
            <section className="space-y-3 pt-1">
              
              {/* Header Separator with Section Title */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1.5 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-amber-400" />
                  <h2 className="text-xs uppercase font-extrabold tracking-wider text-zinc-200">
                    Live Booking Queue & Appointments
                  </h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30">
                    {filteredAppointments.length} Active
                  </span>
                </div>

                {/* Stylist Scope Switcher: All vs My Queue */}
                <div className="flex items-center rounded-xl bg-zinc-900 p-0.5 border border-zinc-800 self-start sm:self-auto shrink-0">
                  <button
                    onClick={() => setStylistScope('all')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                      stylistScope === 'all'
                        ? 'bg-amber-500 text-zinc-950 shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    All Staff
                  </button>
                  <button
                    onClick={() => setStylistScope('mine')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 ${
                      stylistScope === 'mine'
                        ? 'bg-amber-500 text-zinc-950 shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <UserCheck className="w-3 h-3" />
                    <span>My Queue ({currentUser.name.split(' ')[0]})</span>
                  </button>
                </div>
              </div>

              {/* Status Filter Pills & Search Bar */}
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  {['all', 'pending', 'confirmed', 'in_progress', 'completed'].map(st => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize whitespace-nowrap transition-colors ${
                        statusFilter === st
                          ? 'bg-zinc-100 text-zinc-950 font-bold shadow-sm'
                          : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                      }`}
                    >
                      {st === 'in_progress' ? 'In Chair' : st}
                    </button>
                  ))}

                  <button
                    onClick={() => setDateFilter(dateFilter === 'today' ? 'all' : 'today')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                      dateFilter === 'today'
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 font-bold'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                    }`}
                  >
                    {dateFilter === 'today' ? '📅 Today' : 'All Dates'}
                  </button>
                </div>

                {/* Compact Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search client, phone, service..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full sm:w-60 pl-8 pr-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* APPOINTMENT CARDS (WITH STATUS STRIPES) */}
              {filteredAppointments.length === 0 ? (
                <div className="p-10 text-center rounded-2xl bg-zinc-900/30 border border-zinc-800/80">
                  <Clock className="w-7 h-7 text-zinc-600 mx-auto mb-2" />
                  <p className="text-zinc-400 text-xs font-medium">No appointments matching this filter.</p>
                  <button 
                    onClick={() => { setStatusFilter('all'); setDateFilter('all'); setStylistScope('all'); setSearchQuery(''); }}
                    className="text-xs text-amber-400 hover:underline mt-1.5 inline-block"
                  >
                    Reset filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5">
                  {filteredAppointments.map(apt => (
                    <div 
                      key={apt.id}
                      className={`p-3.5 sm:p-4 rounded-2xl border border-zinc-800 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${getStatusCardStyle(apt.status)}`}
                    >
                      {/* Customer & Service Info */}
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-sm sm:text-base">{apt.customerName}</span>
                          {getStatusBadge(apt.status)}
                          <span className="font-mono text-[10px] text-zinc-500">#{apt.id.substring(4, 9)}</span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-zinc-300">
                          <a href={`tel:${apt.customerPhone}`} className="flex items-center gap-1 text-amber-400/90 hover:text-amber-400 font-medium">
                            <Phone className="w-3 h-3" />
                            <span>{apt.customerPhone}</span>
                          </a>
                          <span className="text-zinc-600">•</span>
                          <span className="text-zinc-300 font-medium truncate">{apt.serviceName}</span>
                          <span className="text-amber-400 font-mono font-bold">(Rs. {apt.servicePrice.toLocaleString()})</span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                          <span>📅 {apt.date}</span>
                          <span className="text-zinc-600">•</span>
                          <span className="font-bold text-amber-400">⏰ {apt.timeSlot}</span>
                          <span className="text-zinc-600">•</span>
                          <span>Stylist: <strong className="text-zinc-300">{apt.staffName}</strong></span>
                        </div>

                        {apt.notes && (
                          <p className="text-[11px] text-zinc-400 bg-zinc-950/70 px-2 py-0.5 rounded border border-zinc-800/80 inline-block mt-0.5">
                            "{apt.notes}"
                          </p>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-2 md:pt-0 border-t md:border-t-0 border-zinc-800 shrink-0">
                        {apt.status === 'pending' && (
                          <button
                            onClick={() => handleUpdateStatus(apt.id, 'confirmed')}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1 active:scale-95 transition-all"
                          >
                            <Check className="w-3.5 h-3.5" /> Confirm
                          </button>
                        )}

                        {apt.status === 'confirmed' && (
                          <button
                            onClick={() => handleUpdateStatus(apt.id, 'in_progress')}
                            className="px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border border-purple-500/30 text-xs font-semibold flex items-center gap-1 active:scale-95 transition-all"
                          >
                            <Sparkles className="w-3.5 h-3.5" /> Start (In Chair)
                          </button>
                        )}

                        {apt.status === 'in_progress' && (
                          <button
                            onClick={() => handleUpdateStatus(apt.id, 'completed')}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-500 text-zinc-950 hover:bg-emerald-400 text-xs font-bold flex items-center gap-1 active:scale-95 transition-all shadow-md"
                          >
                            <Check className="w-3.5 h-3.5" /> Complete
                          </button>
                        )}

                        {apt.status !== 'cancelled' && apt.status !== 'completed' && (
                          <button
                            onClick={() => handleUpdateStatus(apt.id, 'cancelled')}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Cancel appointment"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteAppointment(apt.id)}
                          className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 transition-colors"
                          title="Delete record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

          </div>
        )}

        {/* VIEW 2: DEDICATED FULL REPORTS & FINANCIAL ANALYTICS */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div>
                <h2 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-amber-400" />
                  <span>Salon Financial & Performance Report</span>
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Business revenue, stylist output, and service category breakdown.
                </p>
              </div>

              <button
                onClick={() => setActiveTab('appointments')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:text-white"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Queue</span>
              </button>
            </div>

            {/* Financial Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-zinc-900/80 border border-emerald-500/30">
                <span className="text-xs text-zinc-400 font-medium block">Total Realized Revenue</span>
                <p className="font-serif text-2xl font-bold text-emerald-400 mt-1">
                  Rs. {stats.totalRevenue.toLocaleString()}
                </p>
                <span className="text-[11px] text-zinc-500 block mt-1">From completed & confirmed clients</span>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-900/80 border border-amber-500/30">
                <span className="text-xs text-zinc-400 font-medium block">Average Ticket Size</span>
                <p className="font-serif text-2xl font-bold text-amber-400 mt-1">
                  Rs. {stats.avgTicket.toLocaleString()}
                </p>
                <span className="text-[11px] text-zinc-500 block mt-1">Per appointment session</span>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-900/80 border border-blue-500/30">
                <span className="text-xs text-zinc-400 font-medium block">Completed Appointments</span>
                <p className="font-serif text-2xl font-bold text-blue-400 mt-1">
                  {stats.completed} <span className="text-sm font-normal text-zinc-500">/ {stats.total}</span>
                </p>
                <span className="text-[11px] text-zinc-500 block mt-1">Successfully serviced clients</span>
              </div>
            </div>

            {/* Stylist Performance Breakdown */}
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <span>Barber & Stylist Revenue Breakdown</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {reportData.stylistBreakdown.map(st => (
                  <div key={st.id} className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center gap-3">
                    <img 
                      src={st.avatar} 
                      alt={st.name} 
                      className="w-11 h-11 rounded-full object-cover ring-1 ring-amber-500/40" 
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs truncate">{st.name}</span>
                        <span className="text-xs font-mono font-bold text-emerald-400">Rs. {st.revenue.toLocaleString()}</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 truncate">{st.role}</p>
                      
                      <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500">
                        <span>{st.appointmentsCount} total bookings</span>
                        <span className="text-emerald-400 font-medium">{st.completedCount} completed</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Category Distribution */}
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Scissors className="w-4 h-4 text-amber-400" />
                <span>Service Category Revenue Share</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {Object.entries(reportData.categories).map(([category, data]) => (
                  <div key={category} className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-center">
                    <span className="text-[10px] uppercase font-bold text-amber-400 block truncate">{category}</span>
                    <p className="text-base font-bold text-white mt-1">Rs. {data.revenue.toLocaleString()}</p>
                    <span className="text-[10px] text-zinc-500 block">{data.count} bookings</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* VIEW 3: SERVICES & PRICING CATALOG */}
        {activeTab === 'services' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-lg font-bold text-white">Salon Services Catalog</h2>
                <p className="text-xs text-zinc-400">
                  {isAdmin ? 'Add, edit, or adjust service prices.' : 'Price & duration reference (View only).'}
                </p>
              </div>

              {isAdmin ? (
                <button
                  onClick={() => setShowAddServiceModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Service</span>
                </button>
              ) : (
                <div className="flex items-center gap-1 text-xs text-zinc-400 bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-800">
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Admin managed</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {services.map(srv => (
                <div 
                  key={srv.id}
                  className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                        {srv.category}
                      </span>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteService(srv.id)}
                          className="text-zinc-600 hover:text-red-400 p-1"
                          title="Delete Service"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <h3 className="font-semibold text-white text-base mt-2">{srv.name}</h3>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{srv.description}</p>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-zinc-800">
                    <span className="text-xs text-zinc-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {srv.durationMinutes} min
                    </span>
                    <span className="font-serif font-bold text-amber-400 text-base">
                      Rs. {srv.price.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 4: STAFF ROSTER & SHIFTS */}
        {activeTab === 'staff' && (
          <div className="space-y-4">
            <div>
              <h2 className="font-serif text-lg font-bold text-white">Staff Roster & Duty Shifts</h2>
              <p className="text-xs text-zinc-400">Toggle active barber & stylist availability in the salon.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {staff.map(member => {
                const isMemberDidula = member.id === 'staff-1' || member.name.toLowerCase().includes('didula');
                const isCurrentUser = member.id === currentUser.id;

                return (
                  <div 
                    key={member.id}
                    className={`p-4 rounded-2xl bg-zinc-900/70 border text-center flex flex-col items-center relative ${
                      isCurrentUser ? 'border-amber-500/50 ring-1 ring-amber-500/20' : 'border-zinc-800'
                    }`}
                  >
                    {isMemberDidula && (
                      <div className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1">
                        <Crown className="w-2.5 h-2.5" /> Admin
                      </div>
                    )}

                    <img 
                      src={member.avatar} 
                      alt={member.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-amber-500/40 mb-2"
                    />
                    <h3 className="font-bold text-white text-sm">{member.name}</h3>
                    <p className="text-xs text-amber-400/90 font-medium">{member.role}</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">{member.specialty}</p>

                    <div className="my-3 pt-2 border-t border-zinc-800/80 w-full flex items-center justify-around text-xs">
                      <div>
                        <span className="text-zinc-500 block text-[10px]">Rating</span>
                        <span className="font-bold text-white">⭐ {member.rating}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-[10px]">Status</span>
                        <span className={`font-semibold ${member.available ? 'text-emerald-400' : 'text-red-400'}`}>
                          {member.available ? 'On Duty' : 'Off Duty'}
                        </span>
                      </div>
                    </div>

                    {(isAdmin || isCurrentUser) ? (
                      <button
                        onClick={() => handleToggleStaff(member.id)}
                        className={`w-full py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                          member.available 
                            ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' 
                            : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/40'
                        }`}
                      >
                        {member.available ? 'Set Off-Duty' : 'Set On-Duty'}
                      </button>
                    ) : (
                      <div className="w-full py-1.5 text-center text-[11px] text-zinc-500 bg-zinc-950/40 rounded-xl border border-zinc-800/60">
                        Stylist managed
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </main>

      {/* ADD SERVICE MODAL (ADMIN ONLY) */}
      {showAddServiceModal && isAdmin && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400" />
                <h3 className="font-serif text-base font-bold text-white">Add New Salon Service</h3>
              </div>
              <button onClick={() => setShowAddServiceModal(false)} className="text-zinc-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddService} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Service Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Skin Fade & Beard Contouring"
                  value={newServiceName}
                  onChange={e => setNewServiceName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Category</label>
                  <select
                    value={newServiceCategory}
                    onChange={e => setNewServiceCategory(e.target.value as ServiceCategory)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Hair">Hair</option>
                    <option value="Beard & Shave">Beard & Shave</option>
                    <option value="Facials & Skin">Facials & Skin</option>
                    <option value="Spa & Treatments">Spa & Treatments</option>
                    <option value="VIP Packages">VIP Packages</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Price (Rs.)</label>
                  <input
                    type="number"
                    min="500"
                    step="100"
                    value={newServicePrice}
                    onChange={e => setNewServicePrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Duration (Minutes)</label>
                <input
                  type="number"
                  min="15"
                  step="5"
                  value={newServiceDuration}
                  onChange={e => setNewServiceDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Describe treatment..."
                  value={newServiceDescription}
                  onChange={e => setNewServiceDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddServiceModal(false)}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold"
                >
                  Save Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
