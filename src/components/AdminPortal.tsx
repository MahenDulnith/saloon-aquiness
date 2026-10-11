import React, { useState, useMemo } from 'react';
import { 
  Calendar, CheckCircle, Clock, XCircle, AlertCircle, 
  Search, Filter, Plus, Trash2, Edit3, Phone, Mail, 
  RotateCcw, DollarSign, Users, Scissors, Flame, ExternalLink,
  Check, ShieldAlert, Sparkles, Lock
} from 'lucide-react';
import { Appointment, SalonService, StaffMember, AppointmentStatus, ServiceCategory } from '../types';
import { StorageService } from '../services/storage';

interface AdminPortalProps {
  appointments: Appointment[];
  services: SalonService[];
  staff: StaffMember[];
  onAppointmentsUpdated: () => void;
  onServicesUpdated: () => void;
  onStaffUpdated: () => void;
  onLockPortal?: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  appointments,
  services,
  staff,
  onAppointmentsUpdated,
  onServicesUpdated,
  onStaffUpdated,
  onLockPortal
}) => {
  const [activeTab, setActiveTab] = useState<'appointments' | 'services' | 'staff' | 'firebase'>('appointments');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('all'); // 'all' or 'today'

  // Service form state (for adding new service)
  const [showAddServiceModal, setShowAddServiceModal] = useState<boolean>(false);
  const [newServiceName, setNewServiceName] = useState<string>('');
  const [newServiceCategory, setNewServiceCategory] = useState<ServiceCategory>('Hair');
  const [newServicePrice, setNewServicePrice] = useState<number>(2000);
  const [newServiceDuration, setNewServiceDuration] = useState<number>(30);
  const [newServiceDescription, setNewServiceDescription] = useState<string>('');

  const todayIso = new Date().toISOString().split('T')[0];

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
      const matchSearch = 
        apt.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        apt.customerPhone.includes(searchQuery) ||
        apt.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        apt.staffName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchDate && matchSearch;
    });
  }, [appointments, statusFilter, dateFilter, searchQuery, todayIso]);

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
    if (window.confirm('Are you sure you want to delete this appointment record?')) {
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
    if (window.confirm('Delete this service from the catalog?')) {
      StorageService.deleteService(id);
      onServicesUpdated();
    }
  };

  const handleResetData = () => {
    if (window.confirm('Reset all appointments and catalog back to default sample records?')) {
      StorageService.resetDemoData();
      onAppointmentsUpdated();
      onServicesUpdated();
      onStaffUpdated();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Header & Reset */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white">Staff Management Command Center</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Live Offline & Sync
            </span>
          </div>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">
            Real-time appointment schedule, customer check-ins, service catalogue, and staff availability.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onLockPortal && (
            <button
              onClick={onLockPortal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-xs font-semibold transition-colors"
              title="Lock Staff Portal"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Lock Portal</span>
            </button>
          )}
          <button
            onClick={handleResetData}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white text-xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Data</span>
          </button>
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
            <span className="text-xs text-zinc-400 font-medium">Active Stylists</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="font-serif text-2xl sm:text-3xl font-bold text-white mt-2">
            {staff.filter(s => s.available).length} <span className="text-sm font-normal text-zinc-500">/ {staff.length}</span>
          </p>
          <span className="text-[11px] text-emerald-400 mt-1 block">On-duty in salon</span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Estimated Revenue</span>
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
          <span>Services Catalog ({services.length})</span>
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

        <button
          onClick={() => setActiveTab('firebase')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'firebase'
              ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
              : 'text-zinc-400 hover:text-white bg-zinc-900/40'
          }`}
        >
          <Flame className="w-4 h-4 text-orange-400" />
          <span>Firebase Spark Setup</span>
        </button>
      </div>

      {/* TAB 1: APPOINTMENTS */}
      {activeTab === 'appointments' && (
        <div className="space-y-4">
          
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
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
                onClick={() => { setStatusFilter('all'); setDateFilter('all'); setSearchQuery(''); }}
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
                      <span className="text-[11px] text-zinc-400">Stylist: {apt.staffName}</span>
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
                        <Sparkles className="w-3.5 h-3.5" /> Start Service
                      </button>
                    )}

                    {apt.status === 'in_progress' && (
                      <button
                        onClick={() => handleUpdateStatus(apt.id, 'completed')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 text-zinc-950 hover:bg-emerald-400 text-xs font-bold flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" /> Complete
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

      {/* TAB 2: SERVICES CATALOG */}
      {activeTab === 'services' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-bold text-white">Salon Services & Pricing Catalog</h2>
            <button
              onClick={() => setShowAddServiceModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Service</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map(srv => (
              <div 
                key={srv.id}
                className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                      {srv.category}
                    </span>
                    <button
                      onClick={() => handleDeleteService(srv.id)}
                      className="text-zinc-600 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <h3 className="font-semibold text-white text-base mt-1">{srv.name}</h3>
                  <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{srv.description}</p>
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
          <h2 className="font-serif text-lg font-bold text-white">Stylists, Barbers & Therapists Roster</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {staff.map(member => (
              <div 
                key={member.id}
                className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-center flex flex-col items-center"
              >
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
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: FIREBASE ARCHITECTURE & FREE SPARK TIER SETUP */}
      {activeTab === 'firebase' && (
        <div className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold text-white">Firebase Spark (Free Tier) Integration</h2>
              <p className="text-xs text-zinc-400">
                How your web app is designed to connect directly to Firebase at zero monthly cost.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-2">
              <span className="font-bold text-amber-400 text-sm">1. Firebase Auth</span>
              <p className="text-zinc-400 leading-relaxed">
                Free for 10,000 monthly active users. Allows customers and staff to log in with SMS phone number, Google account, or email.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-2">
              <span className="font-bold text-amber-400 text-sm">2. Cloud Firestore</span>
              <p className="text-zinc-400 leading-relaxed">
                Free for 50,000 document reads & 20,000 writes per day. Stores your <code>appointments</code>, <code>services</code>, and <code>staff</code> collections in real-time.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-2">
              <span className="font-bold text-amber-400 text-sm">3. Firebase Hosting</span>
              <p className="text-zinc-400 leading-relaxed">
                Free SSL certificate, global CDN, and custom domain linking (e.g. <code>didulasaloon.lk</code>).
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2">
            <p className="text-xs font-semibold text-white">How to connect when you create your Firebase Project:</p>
            <ol className="text-xs text-zinc-400 space-y-1 list-decimal list-inside leading-relaxed">
              <li>Create a free project at <span className="text-amber-400">console.firebase.google.com</span> named "Didula Saloon".</li>
              <li>Click "Add web app" to get your API keys.</li>
              <li>Place your keys in the project root file <code>.env</code> or inside <code>src/firebase/config.ts</code>.</li>
              <li>Your app will immediately switch from local storage to live real-time Cloud Firestore!</li>
            </ol>
          </div>
        </div>
      )}

      {/* ADD SERVICE MODAL */}
      {showAddServiceModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-white">Add New Salon Service</h3>
              <button onClick={() => setShowAddServiceModal(false)} className="text-zinc-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddService} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Service Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Beard Dye & Hot Oil Therapy"
                  value={newServiceName}
                  onChange={e => setNewServiceName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                  placeholder="Describe the treatment and technique used..."
                  value={newServiceDescription}
                  onChange={e => setNewServiceDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-amber-500"
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
