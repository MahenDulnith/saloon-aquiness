import React, { useState, useMemo } from 'react';
import { 
  Calendar, CheckCircle, Clock, XCircle, AlertCircle, 
  Search, Plus, Trash2, Phone, 
  DollarSign, Users, Scissors, Check, Sparkles, Lock,
  Crown, LogOut, UserCheck, Shield
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
  onLockPortal
}) => {
  const [activeTab, setActiveTab] = useState<'appointments' | 'services' | 'staff'>('appointments');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('all'); // 'all' or 'today'
  const [stylistScope, setStylistScope] = useState<'all' | 'mine'>('all');

  // Service form state (Admin only)
  const [showAddServiceModal, setShowAddServiceModal] = useState<boolean>(false);
  const [newServiceName, setNewServiceName] = useState<string>('');
  const [newServiceCategory, setNewServiceCategory] = useState<ServiceCategory>('Hair');
  const [newServicePrice, setNewServicePrice] = useState<number>(2000);
  const [newServiceDuration, setNewServiceDuration] = useState<number>(30);
  const [newServiceDescription, setNewServiceDescription] = useState<string>('');

  const todayIso = new Date().toISOString().split('T')[0];
  const isAdmin = currentUser.role === 'admin';

  // Stats
  const stats = useMemo(() => {
    const total = appointments.length;
    const pending = appointments.filter(a => a.status === 'pending').length;
    const confirmed = appointments.filter(a => a.status === 'confirmed').length;
    const completed = appointments.filter(a => a.status === 'completed').length;
    const todayCount = appointments.filter(a => a.date === todayIso && a.status !== 'cancelled').length;
    const totalRevenue = appointments
      .filter(a => a.status === 'completed' || a.status === 'confirmed')
      .reduce((sum, a) => sum + a.servicePrice, 0);

    return { total, pending, confirmed, completed, todayCount, totalRevenue };
  }, [appointments, todayIso]);

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

  const handleUpdateStatus = (id: string, status: AppointmentStatus) => {
    StorageService.updateAppointmentStatus(id, status);
    onAppointmentsUpdated();
  };

  const handleDeleteAppointment = (id: string) => {
    if (window.confirm('Are you sure you want to remove this appointment record?')) {
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
      alert('Permission Denied: Only Admin (Didula Perera) can create salon services.');
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
      alert('Permission Denied: Only Admin (Didula Perera) can delete services.');
      return;
    }

    if (window.confirm('Delete this service from the salon catalog?')) {
      StorageService.deleteService(id);
      onServicesUpdated();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Header & User Identity Profile */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-3.5">
          <img 
            src="/logo.png" 
            alt="Saloon Aquiness" 
            className="w-12 h-12 rounded-full object-cover ring-2 ring-amber-500/40 shadow-md shadow-amber-500/10" 
          />
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-wide">
              Saloon Aquiness Portal
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm mt-0.5">
              Daily appointments schedule, customer queue, and salon management.
            </p>
          </div>
        </div>

        {/* User Identity Chip & Lock Action */}
        <div className="flex items-center gap-3 self-start md:self-auto bg-zinc-900/90 border border-zinc-800 p-2 sm:px-3 sm:py-2 rounded-2xl shadow-lg">
          {currentUser.avatar ? (
            <img 
              src={currentUser.avatar} 
              alt={currentUser.name} 
              className="w-10 h-10 rounded-full object-cover ring-2 ring-amber-500/40 shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-sm ring-1 ring-amber-500/40 shrink-0">
              {currentUser.name.charAt(0)}
            </div>
          )}

          <div className="text-left min-w-[130px]">
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-bold text-white leading-tight">
                {currentUser.name}
              </span>
              {isAdmin ? (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1">
                  <Crown className="w-2.5 h-2.5" /> Admin
                </span>
              ) : (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/40 flex items-center gap-1">
                  <Scissors className="w-2.5 h-2.5" /> Stylist
                </span>
              )}
            </div>
            <span className="text-[11px] text-zinc-400 truncate block">
              {currentUser.title}
            </span>
          </div>

          {onLockPortal && (
            <button
              onClick={onLockPortal}
              className="ml-1 p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-red-400 hover:border-red-500/30 transition-colors flex items-center gap-1 text-xs"
              title="Lock portal / switch staff account"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exit</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Pending Requests</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="font-serif text-2xl sm:text-3xl font-bold text-white mt-2">{stats.pending}</p>
          <span className="text-[11px] text-amber-400 mt-1 block">Awaiting confirmation</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Today's Appointments</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="font-serif text-2xl sm:text-3xl font-bold text-white mt-2">{stats.todayCount}</p>
          <span className="text-[11px] text-zinc-500 mt-1 block">Scheduled for today</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Stylists On Duty</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="font-serif text-2xl sm:text-3xl font-bold text-white mt-2">
            {staff.filter(s => s.available).length} <span className="text-sm font-normal text-zinc-500">/ {staff.length}</span>
          </p>
          <span className="text-[11px] text-emerald-400 mt-1 block">Available in salon</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Salon Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="font-serif text-2xl sm:text-3xl font-bold text-amber-400 mt-2">
            Rs. {stats.totalRevenue.toLocaleString()}
          </p>
          <span className="text-[11px] text-zinc-500 mt-1 block">Confirmed & completed</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('appointments')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'appointments'
              ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
              : 'text-zinc-400 hover:text-white bg-zinc-900/40'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Appointments ({appointments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('services')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'services'
              ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
              : 'text-zinc-400 hover:text-white bg-zinc-900/40'
          }`}
        >
          <Scissors className="w-4 h-4" />
          <span>Services & Prices ({services.length})</span>
          {!isAdmin && <Lock className="w-3 h-3 text-zinc-400" />}
        </button>

        <button
          onClick={() => setActiveTab('staff')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'staff'
              ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
              : 'text-zinc-400 hover:text-white bg-zinc-900/40'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff Roster ({staff.length})</span>
        </button>
      </div>

      {/* TAB 1: APPOINTMENTS */}
      {activeTab === 'appointments' && (
        <div className="space-y-4">
          
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
              
              {/* My Queue vs All Staff Scope */}
              <div className="flex items-center rounded-xl bg-zinc-900 p-0.5 border border-zinc-800 shrink-0">
                <button
                  onClick={() => setStylistScope('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    stylistScope === 'all'
                      ? 'bg-amber-500 text-zinc-950'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  All Staff
                </button>
                <button
                  onClick={() => setStylistScope('mine')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                    stylistScope === 'mine'
                      ? 'bg-amber-500 text-zinc-950'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                  title={`Show only appointments assigned to ${currentUser.name}`}
                >
                  <UserCheck className="w-3 h-3" />
                  <span>My Queue ({currentUser.name.split(' ')[0]})</span>
                </button>
              </div>

              <div className="h-5 w-px bg-zinc-800 mx-1 shrink-0" />

              {['all', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap transition-colors ${
                    statusFilter === st
                      ? 'bg-zinc-100 text-zinc-950 font-bold'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}

              <div className="h-5 w-px bg-zinc-800 mx-1 shrink-0" />

              <button
                onClick={() => setDateFilter(dateFilter === 'today' ? 'all' : 'today')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                  dateFilter === 'today'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                }`}
              >
                {dateFilter === 'today' ? '📅 Today Only' : 'All Dates'}
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by client, phone, service..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full md:w-72 pl-9 pr-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Appointments Table / Cards */}
          {filteredAppointments.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-zinc-900/30 border border-zinc-800/80">
              <Clock className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-zinc-400 text-sm font-medium">No appointments found matching your filters.</p>
              <button 
                onClick={() => { setStatusFilter('all'); setDateFilter('all'); setStylistScope('all'); setSearchQuery(''); }}
                className="text-xs text-amber-400 hover:underline mt-2 inline-block"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredAppointments.map(apt => (
                <div 
                  key={apt.id}
                  className="p-4 sm:p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800/90 hover:border-zinc-700/80 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  {/* Left: Customer & Service Info */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-semibold text-white text-base">{apt.customerName}</span>
                      {getStatusBadge(apt.status)}
                      <span className="font-mono text-[11px] text-zinc-500">#{apt.id.substring(4, 9)}</span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-zinc-300">
                      <a href={`tel:${apt.customerPhone}`} className="flex items-center gap-1 hover:text-amber-400">
                        <Phone className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{apt.customerPhone}</span>
                      </a>
                      {apt.customerEmail && (
                        <span className="text-zinc-500 hidden sm:inline">· {apt.customerEmail}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-amber-400 font-medium">
                      <span>{apt.serviceName}</span>
                      <span className="text-zinc-600">•</span>
                      <span>Rs. {apt.servicePrice.toLocaleString()}</span>
                      <span className="text-zinc-600">•</span>
                      <span className="text-zinc-400">{apt.serviceDuration} min</span>
                    </div>

                    {apt.notes && (
                      <p className="text-xs text-zinc-400 bg-zinc-950/60 px-2.5 py-1 rounded-md border border-zinc-800/80 inline-block">
                        Note: "{apt.notes}"
                      </p>
                    )}
                  </div>

                  {/* Middle: Date, Time & Stylist */}
                  <div className="lg:text-center shrink-0 border-t lg:border-t-0 pt-2 lg:pt-0 border-zinc-800">
                    <div className="inline-flex flex-col lg:items-center">
                      <span className="text-xs font-semibold text-zinc-200">{apt.date}</span>
                      <span className="text-sm font-bold text-amber-400">{apt.timeSlot}</span>
                      <span className="text-[11px] text-zinc-400">
                        Stylist: <strong className="text-zinc-200">{apt.staffName}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Right: Quick Action Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap border-t lg:border-t-0 pt-3 lg:pt-0 border-zinc-800 shrink-0">
                    {apt.status === 'pending' && (
                      <button
                        onClick={() => handleUpdateStatus(apt.id, 'confirmed')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" /> Confirm
                      </button>
                    )}

                    {apt.status === 'confirmed' && (
                      <button
                        onClick={() => handleUpdateStatus(apt.id, 'in_progress')}
                        className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border border-purple-500/30 text-xs font-semibold flex items-center gap-1"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> Seat Client (In Chair)
                      </button>
                    )}

                    {apt.status === 'in_progress' && (
                      <button
                        onClick={() => handleUpdateStatus(apt.id, 'completed')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 text-zinc-950 hover:bg-emerald-400 text-xs font-bold flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" /> Complete Service
                      </button>
                    )}

                    {apt.status !== 'cancelled' && apt.status !== 'completed' && (
                      <button
                        onClick={() => handleUpdateStatus(apt.id, 'cancelled')}
                        className="px-2.5 py-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 text-xs transition-colors"
                        title="Cancel appointment"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}

                    {/* Delete appointment allowed for Admin or general cleanup */}
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

        </div>
      )}

      {/* TAB 2: SERVICES CATALOG (ADMIN CONTROLS) */}
      {activeTab === 'services' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-lg font-bold text-white">Salon Services & Pricing Catalog</h2>
                {isAdmin ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    Admin Editing Active
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                    View-Only (Staff)
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {isAdmin 
                  ? 'Manage salon service packages, durations, and official prices.' 
                  : 'Salon service catalogue and pricing guide for client reference.'}
              </p>
            </div>

            {isAdmin ? (
              <button
                onClick={() => setShowAddServiceModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-colors self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Service</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs self-start sm:self-auto">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Only Didula (Admin) can add services</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map(srv => (
              <div 
                key={srv.id}
                className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                      {srv.category}
                    </span>
                    {/* Only Admin can delete services */}
                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteService(srv.id)}
                        className="text-zinc-600 hover:text-red-400 transition-colors p-1"
                        title="Delete Service (Admin)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <h3 className="font-semibold text-white text-base mt-2">{srv.name}</h3>
                  <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">{srv.description}</p>
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-800/80">
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

      {/* TAB 3: STAFF ROSTER */}
      {activeTab === 'staff' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800">
            <div>
              <h2 className="font-serif text-lg font-bold text-white">Stylists, Barbers & Therapists Roster</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Monitor team availability and daily on-duty status.
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {staff.map(member => {
              const isMemberDidula = member.id === 'staff-1' || member.name.toLowerCase().includes('didula');
              const isCurrentUser = member.id === currentUser.id;

              return (
                <div 
                  key={member.id}
                  className={`p-5 rounded-2xl bg-zinc-900/60 border text-center flex flex-col items-center relative ${
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
                    className="w-20 h-20 rounded-full object-cover border-2 border-amber-500/40 mb-3"
                  />
                  <h3 className="font-bold text-white text-base">{member.name}</h3>
                  <p className="text-xs text-amber-400/90 font-medium">{member.role}</p>
                  <p className="text-xs text-zinc-400 mt-1">{member.specialty}</p>

                  <div className="my-4 pt-3 border-t border-zinc-800/80 w-full flex items-center justify-around text-xs">
                    <div>
                      <span className="text-zinc-500 block">Rating</span>
                      <span className="font-bold text-white">⭐ {member.rating}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Status</span>
                      <span className={`font-semibold ${member.available ? 'text-emerald-400' : 'text-red-400'}`}>
                        {member.available ? 'On Duty' : 'Off Duty'}
                      </span>
                    </div>
                  </div>

                  {/* Duty status toggle: Admin can toggle all, staff can toggle their own */}
                  {(isAdmin || isCurrentUser) ? (
                    <button
                      onClick={() => handleToggleStaff(member.id)}
                      className={`w-full py-2 rounded-xl text-xs font-semibold transition-colors ${
                        member.available 
                          ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' 
                          : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/40'
                      }`}
                    >
                      {member.available ? 'Mark as Off-Duty' : 'Set Available Today'}
                    </button>
                  ) : (
                    <div className="w-full py-2 text-center text-xs text-zinc-500 bg-zinc-950/40 rounded-xl border border-zinc-800/60">
                      Managed by Stylist
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ADD SERVICE MODAL (ADMIN ONLY) */}
      {showAddServiceModal && isAdmin && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400" />
                <h3 className="font-serif text-lg font-bold text-white">Add New Salon Service</h3>
              </div>
              <button onClick={() => setShowAddServiceModal(false)} className="text-zinc-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddService} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Service Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Skin Fade & Beard Contouring"
                  value={newServiceName}
                  onChange={e => setNewServiceName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Category</label>
                  <select
                    value={newServiceCategory}
                    onChange={e => setNewServiceCategory(e.target.value as ServiceCategory)}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-amber-500"
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
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-amber-500"
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
                  className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Describe the treatment and technique used..."
                  value={newServiceDescription}
                  onChange={e => setNewServiceDescription(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddServiceModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold"
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
