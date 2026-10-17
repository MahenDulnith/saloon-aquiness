import React, { useState, useMemo, useRef } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Search, 
  Phone, 
  Check, 
  Sparkles, 
  Lock,
  LogOut, 
  Globe, 
  ChevronRight, 
  ChevronLeft,
  MoreHorizontal, 
  Plus, 
  Camera, 
  Users, 
  Scissors, 
  BarChart3, 
  TrendingUp, 
  X, 
  User, 
  Trash2,
  CalendarDays,
  ListOrdered,
  SlidersHorizontal,
  Mail,
  ShieldCheck,
  CheckCircle2,
  Smartphone
} from 'lucide-react';
import { Appointment, SalonService, StaffMember, AppointmentStatus, ServiceCategory, CurrentStaffUser } from '../types';
import { StorageService } from '../services/storage';
import { FirebaseService } from '../services/firebaseService';
import { IosInstallModal } from './PWAInstallBanner';

interface AdminPortalProps {
  currentUser: CurrentStaffUser;
  appointments: Appointment[];
  services: SalonService[];
  staff: StaffMember[];
  onAppointmentsUpdated: () => void;
  onServicesUpdated: () => void;
  onStaffUpdated: () => void;
  onCurrentUserUpdated?: (user: CurrentStaffUser) => void;
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
  onCurrentUserUpdated,
  onExitToClientWebsite,
  onLockPortal
}) => {
  // Navigation tabs: 'queue' | 'calendar' | 'clients' | 'settings'
  const [activeTab, setActiveTab] = useState<'queue' | 'calendar' | 'clients' | 'settings'>('queue');

  // Queue sub-filters
  const [queueScope, setQueueScope] = useState<'all' | 'mine'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Settings subviews: 'root' | 'staff' | 'services' | 'analytics'
  const [settingsSubView, setSettingsSubView] = useState<'root' | 'staff' | 'services' | 'analytics'>('root');

  // Modals
  const [showStaffModal, setShowStaffModal] = useState<boolean>(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  const [showServiceModal, setShowServiceModal] = useState<boolean>(false);
  const [editingService, setEditingService] = useState<SalonService | null>(null);

  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);
  const [actionAppointment, setActionAppointment] = useState<Appointment | null>(null);
  const [showInstallGuide, setShowInstallGuide] = useState<boolean>(false);

  // Calendar selected date
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const todayIso = new Date().toISOString().split('T')[0];

  // Live synced current user (keeps profile photo & details in sync immediately)
  const activeUser: CurrentStaffUser = useMemo(() => {
    const matched = staff.find(
      s => s.id === currentUser.id || s.name.toLowerCase() === currentUser.name.toLowerCase()
    );
    if (matched) {
      return {
        ...currentUser,
        name: matched.name,
        avatar: matched.avatar || currentUser.avatar,
        title: matched.role || currentUser.title,
        email: matched.email || currentUser.email
      };
    }
    return currentUser;
  }, [currentUser, staff]);

  const isAdmin = activeUser.role === 'admin';

  // Format today's date (e.g. "Saturday, 17 October")
  const formattedToday = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  }, []);

  // Compute key metrics
  const stats = useMemo(() => {
    const todayAppointments = appointments.filter(a => a.date === todayIso && a.status !== 'cancelled');
    const pendingCount = appointments.filter(a => a.status === 'pending').length;
    const inChairCount = appointments.filter(a => a.status === 'in_progress').length;
    const bookedTodayCount = todayAppointments.length;
    const todayRevenue = todayAppointments
      .filter(a => a.status === 'completed' || a.status === 'confirmed' || a.status === 'in_progress')
      .reduce((sum, a) => sum + a.servicePrice, 0);

    return { pendingCount, inChairCount, bookedTodayCount, todayRevenue };
  }, [appointments, todayIso]);

  // Filtered Queue Appointments
  const filteredQueueAppointments = useMemo(() => {
    return appointments.filter(apt => {
      // Exclude cancelled/completed from live active queue unless searched
      if (!searchQuery && (apt.status === 'cancelled' || apt.status === 'completed')) {
        return false;
      }

      // Stylist scope
      if (queueScope === 'mine') {
        const isMine = apt.staffId === activeUser.id || 
          apt.staffName.toLowerCase().includes(activeUser.name.toLowerCase()) ||
          activeUser.name.toLowerCase().includes(apt.staffName.toLowerCase());
        if (!isMine) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = apt.customerName.toLowerCase().includes(q);
        const matchPhone = apt.customerPhone.includes(q);
        const matchService = apt.serviceName.toLowerCase().includes(q);
        const matchStaff = apt.staffName.toLowerCase().includes(q);
        return matchName || matchPhone || matchService || matchStaff;
      }

      return true;
    });
  }, [appointments, queueScope, searchQuery, currentUser]);

  // Unique clients derived from appointments
  const clientsList = useMemo(() => {
    const map = new Map<string, {
      name: string;
      phone: string;
      email?: string;
      totalVisits: number;
      totalSpend: number;
      lastVisit: string;
      lastService: string;
    }>();

    appointments.forEach(a => {
      const key = a.customerPhone || a.customerName;
      if (!map.has(key)) {
        map.set(key, {
          name: a.customerName,
          phone: a.customerPhone,
          email: a.customerEmail,
          totalVisits: 1,
          totalSpend: a.servicePrice,
          lastVisit: a.date,
          lastService: a.serviceName
        });
      } else {
        const item = map.get(key)!;
        item.totalVisits += 1;
        item.totalSpend += a.servicePrice;
        if (a.date > item.lastVisit) {
          item.lastVisit = a.date;
          item.lastService = a.serviceName;
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalVisits - a.totalVisits);
  }, [appointments]);

  // Status updates
  const handleUpdateStatus = (id: string, status: AppointmentStatus) => {
    StorageService.updateAppointmentStatus(id, status);
    onAppointmentsUpdated();
  };

  const handleDeleteAppointment = (id: string) => {
    if (window.confirm('Delete this appointment record?')) {
      StorageService.deleteAppointment(id);
      onAppointmentsUpdated();
      setActionAppointment(null);
    }
  };

  // Helper for image compression to data URL (keeps localStorage compact & fast)
  const compressImageToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('Please select an image file (JPG, PNG, WebP).'));
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read photo file.'));
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error('Failed to process image.'));
        img.onload = () => {
          // Automatic 1:1 center square crop (works with tall iPhone portraits or wide landscapes)
          const cropSize = Math.min(img.width, img.height);
          const offsetX = Math.round((img.width - cropSize) / 2);
          const offsetY = Math.round((img.height - cropSize) / 2);

          const targetSize = 320;
          const canvas = document.createElement('canvas');
          canvas.width = targetSize;
          canvas.height = targetSize;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(img.src);
            return;
          }
          
          // Crop and scale to perfect 1:1 square
          ctx.drawImage(
            img,
            offsetX,
            offsetY,
            cropSize,
            cropSize,
            0,
            0,
            targetSize,
            targetSize
          );
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // Staff Form State
  const [staffFormName, setStaffFormName] = useState('');
  const [staffFormPhone, setStaffFormPhone] = useState('');
  const [staffFormEmail, setStaffFormEmail] = useState('');
  const [staffFormRole, setStaffFormRole] = useState<'Stylist' | 'Admin'>('Stylist');
  const [staffFormPin, setStaffFormPin] = useState('1234');
  const [staffFormActive, setStaffFormActive] = useState(true);
  const [staffFormAvatar, setStaffFormAvatar] = useState<string>('');
  const [isProcessingStaffPhoto, setIsProcessingStaffPhoto] = useState<boolean>(false);
  const staffFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleStaffPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingStaffPhoto(true);
      const compressedDataUrl = await compressImageToDataUrl(file);
      setStaffFormAvatar(compressedDataUrl);
    } catch (err: any) {
      alert(err?.message || 'Could not load photo. Please try a different image.');
    } finally {
      setIsProcessingStaffPhoto(false);
      if (e.target) e.target.value = '';
    }
  };

  const openNewStaffModal = () => {
    setEditingStaff(null);
    setStaffFormName('');
    setStaffFormPhone('');
    setStaffFormEmail('');
    setStaffFormRole('Stylist');
    setStaffFormPin('1234');
    setStaffFormActive(true);
    setStaffFormAvatar('');
    setShowStaffModal(true);
  };

  const openEditStaffModal = (st: StaffMember) => {
    setEditingStaff(st);
    setStaffFormName(st.name);
    setStaffFormPhone(st.phone || '');
    setStaffFormEmail(st.email || '');
    setStaffFormRole(st.role.toLowerCase().includes('admin') || st.role.toLowerCase().includes('founder') ? 'Admin' : 'Stylist');
    setStaffFormPin(st.pin || '1234');
    setStaffFormActive(st.available !== false);
    setStaffFormAvatar(st.avatar || '');
    setShowStaffModal(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffFormName.trim()) {
      alert('Please enter staff full name.');
      return;
    }

    const firstName = staffFormName.trim().split(' ')[0];

    const staffMemberToSave: StaffMember = {
      id: editingStaff ? editingStaff.id : `staff-${Date.now().toString(36)}`,
      name: staffFormName.trim(),
      role: staffFormRole === 'Admin' ? 'Admin' : 'Stylist',
      specialty: editingStaff?.specialty || 'Hair & Beard Styling',
      rating: editingStaff?.rating ?? 5.0,
      reviewsCount: editingStaff?.reviewsCount ?? 1,
      avatar: staffFormAvatar.trim(),
      email: staffFormEmail.trim() || `${firstName.toLowerCase()}@saloonaquiness.lk`,
      phone: staffFormPhone.trim() || '',
      pin: staffFormPin.trim() || '1234',
      available: staffFormActive,
      workingDays: editingStaff?.workingDays || [1, 2, 3, 4, 5, 6],
      servicesOffered: editingStaff?.servicesOffered || ['all']
    };

    await FirebaseService.addOrUpdateStaff(staffMemberToSave);

    // Sync auth user avatar in session if current user edited their own profile
    const isEditingSelf = 
      activeUser.id === staffMemberToSave.id || 
      currentUser.id === staffMemberToSave.id ||
      currentUser.name.toLowerCase() === staffMemberToSave.name.toLowerCase();

    if (isEditingSelf) {
      const updatedUser: CurrentStaffUser = {
        ...activeUser,
        name: staffMemberToSave.name,
        avatar: staffMemberToSave.avatar,
        title: staffMemberToSave.role,
        email: staffMemberToSave.email
      };
      if (onCurrentUserUpdated) {
        onCurrentUserUpdated(updatedUser);
      }
      try {
        localStorage.setItem('aquiness_staff_auth', JSON.stringify({
          authenticated: true,
          timestamp: Date.now(),
          user: updatedUser
        }));
      } catch (err) {
        console.error('Error syncing auth session avatar:', err);
      }
    }

    onStaffUpdated();
    setShowStaffModal(false);
  };

  const handleDeleteStaff = async (id: string) => {
    if (id === 'staff-1' || editingStaff?.name.toLowerCase().includes('didula')) {
      alert('Cannot delete the salon owner account.');
      return;
    }
    if (window.confirm('Remove this staff member from the salon?')) {
      await FirebaseService.deleteStaff(id);
      onStaffUpdated();
      setShowStaffModal(false);
    }
  };

  // Service Form State
  const [serviceFormName, setServiceFormName] = useState('');
  const [serviceFormPrice, setServiceFormPrice] = useState('2000');
  const [serviceFormDuration, setServiceFormDuration] = useState('45');
  const [serviceFormDescription, setServiceFormDescription] = useState('');
  const [serviceFormActive, setServiceFormActive] = useState(true);
  const [serviceFormImage, setServiceFormImage] = useState<string>('');
  const [isProcessingServicePhoto, setIsProcessingServicePhoto] = useState<boolean>(false);
  const serviceFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleServicePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingServicePhoto(true);
      const compressedDataUrl = await compressImageToDataUrl(file);
      setServiceFormImage(compressedDataUrl);
    } catch (err: any) {
      alert(err?.message || 'Could not load photo.');
    } finally {
      setIsProcessingServicePhoto(false);
      if (e.target) e.target.value = '';
    }
  };

  const openNewServiceModal = () => {
    setEditingService(null);
    setServiceFormName('');
    setServiceFormPrice('2000');
    setServiceFormDuration('45');
    setServiceFormDescription('');
    setServiceFormActive(true);
    setServiceFormImage('');
    setShowServiceModal(true);
  };

  const openEditServiceModal = (srv: SalonService) => {
    setEditingService(srv);
    setServiceFormName(srv.name);
    setServiceFormPrice(String(srv.price));
    setServiceFormDuration(String(srv.durationMinutes));
    setServiceFormDescription(srv.description || '');
    setServiceFormActive(srv.active !== false);
    setServiceFormImage(srv.image || '');
    setShowServiceModal(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceFormName.trim()) {
      alert('Please enter service name.');
      return;
    }

    const serviceToSave: SalonService = {
      id: editingService ? editingService.id : `srv-${Date.now().toString(36)}`,
      name: serviceFormName.trim(),
      category: editingService ? editingService.category : 'Hair',
      price: Number(serviceFormPrice) || 1500,
      durationMinutes: Number(serviceFormDuration) || 30,
      description: serviceFormDescription.trim(),
      popular: editingService ? editingService.popular : false,
      active: serviceFormActive,
      offeredBy: (editingService && editingService.offeredBy) ? editingService.offeredBy : ['all'],
      image: serviceFormImage.trim() || ''
    };

    await FirebaseService.addOrUpdateService(serviceToSave);
    onServicesUpdated();
    setShowServiceModal(false);
  };

  const handleToggleServiceActive = async (srvId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = services.find(s => s.id === srvId);
    if (target) {
      await FirebaseService.addOrUpdateService({
        ...target,
        active: target.active === false ? true : false
      });
    } else {
      StorageService.toggleServiceActive(srvId);
    }
    onServicesUpdated();
  };

  const handleDeleteService = async (srvId: string) => {
    if (window.confirm('Delete this service from the salon catalog?')) {
      await FirebaseService.deleteService(srvId);
      onServicesUpdated();
      setShowServiceModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f6] text-zinc-900 select-none font-sans flex flex-col justify-between">
      
      {/* Centered App Container */}
      <div className="w-full max-w-md mx-auto min-h-screen flex flex-col pb-24 px-4 pt-3">

        {/* ----------------- TAB 1: QUEUE ----------------- */}
        {activeTab === 'queue' && (
          <div className="flex flex-col w-full animate-fadeIn">
            
            {/* Top Bar: Title, Date, Avatar */}
            <div className="flex items-center justify-between pt-2 pb-1">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 leading-tight">
                  Queue
                </h1>
                <p className="text-sm font-medium text-zinc-500 mt-0.5">
                  {formattedToday}
                </p>
              </div>

              {/* User Avatar Circle */}
              <button
                type="button"
                onClick={() => setShowProfileMenu(true)}
                className="w-11 h-11 rounded-full bg-[#0d6efd] text-white font-extrabold text-lg flex items-center justify-center shadow-md active:scale-95 transition-transform overflow-hidden ring-2 ring-white/80"
                title={`${activeUser.name} (${activeUser.role})`}
              >
                {activeUser.avatar ? (
                  <img
                    src={activeUser.avatar}
                    alt={activeUser.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : null}
                <span className={activeUser.avatar ? 'sr-only' : 'block'}>
                  {activeUser.name.charAt(0).toUpperCase()}
                </span>
              </button>
            </div>

            {/* Metrics Card */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-200/60 mt-3.5">
              <div className="grid grid-cols-3 text-center">
                <div>
                  <span className="block text-2xl font-black text-amber-600 leading-none">
                    {stats.pendingCount}
                  </span>
                  <span className="text-xs font-semibold text-zinc-500 mt-1 block">
                    Pending
                  </span>
                </div>
                <div>
                  <span className="block text-2xl font-black text-purple-600 leading-none">
                    {stats.inChairCount}
                  </span>
                  <span className="text-xs font-semibold text-zinc-500 mt-1 block">
                    In chair
                  </span>
                </div>
                <div>
                  <span className="block text-2xl font-black text-[#0d6efd] leading-none">
                    {stats.bookedTodayCount}
                  </span>
                  <span className="text-xs font-semibold text-zinc-500 mt-1 block">
                    Booked today
                  </span>
                </div>
              </div>

              {/* Hairline divider */}
              <div className="border-t border-zinc-100 my-3" />

              {/* Revenue Row */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-600 font-medium">
                  Revenue today <strong className="text-zinc-900 font-bold ml-1">Rs. {stats.todayRevenue.toLocaleString()}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('settings');
                    setSettingsSubView('analytics');
                  }}
                  className="text-[#0d6efd] font-bold hover:underline flex items-center text-sm"
                >
                  Analytics ›
                </button>
              </div>
            </div>

            {/* Segmented Control Pill: All staff vs My queue */}
            <div className="w-full bg-[#e2e5eb] p-1 rounded-xl flex items-center mt-3.5">
              <button
                type="button"
                onClick={() => setQueueScope('all')}
                className={`flex-1 py-1.5 rounded-lg text-sm font-bold text-center transition-all ${
                  queueScope === 'all'
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900 font-medium'
                }`}
              >
                All staff
              </button>
              <button
                type="button"
                onClick={() => setQueueScope('mine')}
                className={`flex-1 py-1.5 rounded-lg text-sm font-bold text-center transition-all ${
                  queueScope === 'mine'
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900 font-medium'
                }`}
              >
                My queue
              </button>
            </div>

            {/* Search Input Pill */}
            <div className="relative mt-3">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search client, phone, service"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#e5e9f0]/70 rounded-xl text-sm placeholder-zinc-500 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0d6efd] transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Appointment Cards List */}
            <div className="space-y-3 mt-3.5">
              {filteredQueueAppointments.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center text-zinc-400 border border-zinc-200/60 shadow-sm mt-2">
                  <Sparkles className="w-8 h-8 mx-auto text-zinc-300 mb-2" />
                  <p className="font-semibold text-zinc-700">No appointments in this queue</p>
                  <p className="text-xs text-zinc-400 mt-1">New client bookings will arrive here automatically.</p>
                </div>
              ) : (
                filteredQueueAppointments.map(apt => {
                  const isPending = apt.status === 'pending';
                  const isInChair = apt.status === 'in_progress';
                  const isConfirmed = apt.status === 'confirmed';
                  const isCompleted = apt.status === 'completed';

                  return (
                    <div 
                      key={apt.id}
                      className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-200/60 transition-all hover:shadow-md"
                    >
                      {/* Card Header: Client Name & Status Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-base text-zinc-900 leading-snug">
                          {apt.customerName}
                        </h3>

                        {/* Status Badge */}
                        {isPending && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#fff3cd] text-[#b7791f] whitespace-nowrap">
                            Pending
                          </span>
                        )}
                        {isInChair && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#efe8fa] text-[#7048e8] whitespace-nowrap">
                            In chair
                          </span>
                        )}
                        {isConfirmed && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#dbeafe] text-[#1e40af] whitespace-nowrap">
                            Confirmed
                          </span>
                        )}
                        {isCompleted && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#d1fae5] text-[#065f46] whitespace-nowrap">
                            Completed
                          </span>
                        )}
                      </div>

                      {/* Service & Price */}
                      <div className="flex items-center justify-between mt-1 text-sm">
                        <span className="text-zinc-600 font-medium truncate max-w-[220px]">
                          {apt.serviceName}
                        </span>
                        <span className="font-bold text-zinc-900 ml-2">
                          Rs. {apt.servicePrice.toLocaleString()}
                        </span>
                      </div>

                      {/* Time & Stylist */}
                      <p className="text-xs text-zinc-500 font-medium mt-0.5">
                        {apt.timeSlot} · {apt.staffName.split(' ')[0]}
                      </p>

                      {/* Client Note (if any) */}
                      {apt.notes && (
                        <p className="text-xs italic text-zinc-500 mt-1.5 leading-relaxed bg-zinc-50 p-2 rounded-lg border border-zinc-100">
                          “{apt.notes}”
                        </p>
                      )}

                      {/* Actions Row */}
                      <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-zinc-100/90">
                        {/* Status Change Buttons */}
                        {isPending && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(apt.id, 'confirmed')}
                              className="bg-[#0d6efd] hover:bg-[#0b5ed7] text-white font-bold text-sm px-5 py-2 rounded-full shadow-sm active:scale-95 transition-all"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(apt.id, 'cancelled')}
                              className="text-red-600 hover:text-red-700 font-bold text-sm px-3 hover:underline"
                            >
                              Decline
                            </button>
                          </>
                        )}

                        {isInChair && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(apt.id, 'completed')}
                            className="bg-[#198754] hover:bg-[#157347] text-white font-bold text-sm px-5 py-2 rounded-full shadow-sm active:scale-95 transition-all"
                          >
                            Complete
                          </button>
                        )}

                        {isConfirmed && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(apt.id, 'in_progress')}
                            className="bg-[#198754] hover:bg-[#157347] text-white font-bold text-sm px-5 py-2 rounded-full shadow-sm active:scale-95 transition-all"
                          >
                            Start
                          </button>
                        )}

                        {isCompleted && (
                          <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 py-1 px-2">
                            <Check className="w-4 h-4 stroke-[2.5]" /> Done
                          </span>
                        )}

                        {/* Right Utility Icons: Call & More */}
                        <div className="flex items-center gap-1.5 ml-auto">
                          <a
                            href={`tel:${apt.customerPhone}`}
                            className="w-9 h-9 rounded-full bg-blue-50 text-[#0d6efd] flex items-center justify-center hover:bg-blue-100 active:scale-95 transition-all"
                            title={`Call ${apt.customerName}`}
                          >
                            <Phone className="w-4 h-4" />
                          </a>

                          <button
                            type="button"
                            onClick={() => setActionAppointment(apt)}
                            className="w-9 h-9 rounded-full bg-zinc-100 text-zinc-600 flex items-center justify-center hover:bg-zinc-200 active:scale-95 transition-all"
                            title="More options"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })
              )}
            </div>

          </div>
        )}

        {/* ----------------- TAB 2: CALENDAR ----------------- */}
        {activeTab === 'calendar' && (
          <div className="flex flex-col w-full animate-fadeIn pt-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">
              Calendar
            </h1>
            <p className="text-sm font-medium text-zinc-500 mt-0.5">
              Day schedule & time slots
            </p>

            {/* Date Pill Selector */}
            <div className="flex items-center gap-2 overflow-x-auto py-3 no-scrollbar">
              {[-1, 0, 1, 2, 3, 4, 5].map(offset => {
                const target = new Date();
                target.setDate(target.getDate() + offset);
                const targetIso = target.toISOString().split('T')[0];
                const isSelected = selectedCalendarDate === targetIso;
                const isToday = offset === 0;

                const dayName = target.toLocaleDateString('en-GB', { weekday: 'short' });
                const dayNum = target.getDate();

                return (
                  <button
                    key={offset}
                    type="button"
                    onClick={() => setSelectedCalendarDate(targetIso)}
                    className={`flex flex-col items-center justify-center min-w-[54px] py-2 px-1.5 rounded-2xl transition-all ${
                      isSelected
                        ? 'bg-[#0d6efd] text-white shadow-md font-bold'
                        : 'bg-white text-zinc-700 border border-zinc-200/60 hover:border-zinc-300'
                    }`}
                  >
                    <span className="text-[11px] uppercase tracking-wider">{dayName}</span>
                    <span className="text-lg font-bold">{dayNum}</span>
                    {isToday && (
                      <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? 'bg-white' : 'bg-[#0d6efd]'}`} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Appointments for Selected Date */}
            <div className="space-y-3 mt-2">
              {appointments.filter(a => a.date === selectedCalendarDate && a.status !== 'cancelled').length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center text-zinc-400 border border-zinc-200/60 shadow-sm mt-3">
                  <CalendarDays className="w-8 h-8 mx-auto text-zinc-300 mb-2" />
                  <p className="font-semibold text-zinc-700">No appointments scheduled</p>
                  <p className="text-xs text-zinc-400 mt-1">This date has no bookings recorded.</p>
                </div>
              ) : (
                appointments
                  .filter(a => a.date === selectedCalendarDate && a.status !== 'cancelled')
                  .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot))
                  .map(apt => (
                    <div 
                      key={apt.id}
                      className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-200/60 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-[70px]">
                        <span className="text-sm font-bold text-[#0d6efd] block leading-tight">
                          {apt.timeSlot}
                        </span>
                        <span className="text-xs text-zinc-400 font-medium">
                          {apt.serviceDuration}m
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-zinc-900 truncate">
                          {apt.customerName}
                        </h4>
                        <p className="text-xs text-zinc-500 truncate">
                          {apt.serviceName} · {apt.staffName.split(' ')[0]}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 capitalize">
                          {apt.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))
              )}
            </div>

          </div>
        )}

        {/* ----------------- TAB 3: CLIENTS ----------------- */}
        {activeTab === 'clients' && (
          <div className="flex flex-col w-full animate-fadeIn pt-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">
              Clients
            </h1>
            <p className="text-sm font-medium text-zinc-500 mt-0.5">
              Client directory & booking history
            </p>

            <div className="space-y-3 mt-4">
              {clientsList.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center text-zinc-400 border border-zinc-200/60 shadow-sm mt-3">
                  <Users className="w-8 h-8 mx-auto text-zinc-300 mb-2" />
                  <p className="font-semibold text-zinc-700">No client records found</p>
                  <p className="text-xs text-zinc-400 mt-1">Clients will appear once bookings are placed.</p>
                </div>
              ) : (
                clientsList.map((client, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-200/60 flex items-center justify-between gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-zinc-100 text-zinc-700 font-bold flex items-center justify-center shrink-0">
                      {client.name.charAt(0)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-zinc-900 truncate">
                        {client.name}
                      </h4>
                      <p className="text-xs text-zinc-500">
                        {client.phone}
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
                        {client.totalVisits} visit{client.totalVisits > 1 ? 's' : ''} · Spent Rs. {client.totalSpend.toLocaleString()}
                      </p>
                    </div>

                    <a
                      href={`tel:${client.phone}`}
                      className="w-9 h-9 rounded-full bg-blue-50 text-[#0d6efd] flex items-center justify-center hover:bg-blue-100 transition-colors shrink-0"
                      title={`Call ${client.name}`}
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  </div>
                ))
              )}
            </div>

          </div>
        )}

        {/* ----------------- TAB 4: SETTINGS ----------------- */}
        {activeTab === 'settings' && (
          <div className="flex flex-col w-full animate-fadeIn pt-2">
            
            {/* SUBVIEW 1: SETTINGS ROOT */}
            {settingsSubView === 'root' && (
              <>
                <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">
                  Settings
                </h1>
                <p className="text-sm font-medium text-zinc-500 mt-0.5">
                  Salon preferences & portal configuration
                </p>

                {/* Profile Card */}
                <div 
                  onClick={() => {
                    const me = staff.find(s => s.id === activeUser.id);
                    if (me) openEditStaffModal(me);
                  }}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-200/60 mt-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-zinc-50/70 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-full bg-[#0d6efd] text-white font-extrabold text-xl flex items-center justify-center shadow-sm shrink-0 overflow-hidden ring-1 ring-zinc-200/80">
                      {activeUser.avatar ? (
                        <img
                          src={activeUser.avatar}
                          alt={activeUser.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : null}
                      <span className={activeUser.avatar ? 'sr-only' : 'block'}>
                        {activeUser.name.charAt(0)}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-zinc-900 truncate">
                          {activeUser.name}
                        </h3>
                        {isAdmin && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            Owner
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 truncate">
                        {activeUser.title || (isAdmin ? 'Admin' : 'Stylist')} · {activeUser.email}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-zinc-600 transition-colors shrink-0" />
                </div>

                {/* Group 1: SALON MANAGEMENT */}
                <span className="text-xs font-bold text-zinc-400 tracking-wider uppercase mt-6 mb-2 block px-1">
                  SALON MANAGEMENT
                </span>
                <div className="bg-white rounded-2xl shadow-sm border border-zinc-200/60 overflow-hidden divide-y divide-zinc-100">
                  
                  {/* Staff Row */}
                  <button
                    type="button"
                    onClick={() => setSettingsSubView('staff')}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-50/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-[#0d6efd]" />
                      <div>
                        <span className="font-bold text-sm text-zinc-900 block">Staff</span>
                        <span className="text-xs text-zinc-500">{staff.length} staff members</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-400" />
                  </button>

                  {/* Services Row */}
                  <button
                    type="button"
                    onClick={() => setSettingsSubView('services')}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-50/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Scissors className="w-5 h-5 text-[#0d6efd]" />
                      <div>
                        <span className="font-bold text-sm text-zinc-900 block">Services</span>
                        <span className="text-xs text-zinc-500">{services.length} catalog items</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-400" />
                  </button>

                  {/* Analytics Row */}
                  <button
                    type="button"
                    onClick={() => setSettingsSubView('analytics')}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-50/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <BarChart3 className="w-5 h-5 text-[#0d6efd]" />
                      <div>
                        <span className="font-bold text-sm text-zinc-900 block">Analytics & Performance</span>
                        <span className="text-xs text-zinc-500">Revenue, tickets & trends</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-400" />
                  </button>

                </div>

                {/* Group 2: PORTAL ACCESS */}
                <span className="text-xs font-bold text-zinc-400 tracking-wider uppercase mt-6 mb-2 block px-1">
                  PORTAL ACCESS
                </span>
                <div className="bg-white rounded-2xl shadow-sm border border-zinc-200/60 overflow-hidden divide-y divide-zinc-100">
                  
                  {/* Exit to Client Booking Website */}
                  {onExitToClientWebsite && (
                    <button
                      type="button"
                      onClick={onExitToClientWebsite}
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-50/60 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Globe className="w-5 h-5 text-[#0d6efd]" />
                        <span className="font-bold text-sm text-zinc-900">Client Booking Website</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-zinc-400" />
                    </button>
                  )}

                  {/* Add to Home Screen / Install App */}
                  <button
                    type="button"
                    onClick={() => setShowInstallGuide(true)}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-50/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-5 h-5 text-[#0d6efd]" />
                      <div>
                        <span className="font-bold text-sm text-zinc-900 block">Add to Home Screen</span>
                        <span className="text-xs text-zinc-500">Install as iPhone (Safari) or Android App</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-400" />
                  </button>

                  {/* Lock Portal */}
                  {onLockPortal && (
                    <button
                      type="button"
                      onClick={onLockPortal}
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-50/60 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Lock className="w-5 h-5 text-zinc-600" />
                        <span className="font-bold text-sm text-zinc-900">Lock Portal (Require PIN)</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-zinc-400" />
                    </button>
                  )}

                  {/* Log Out */}
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Log out of staff portal?')) {
                        localStorage.removeItem('aquiness_staff_auth');
                        if (onLockPortal) onLockPortal();
                      }
                    }}
                    className="w-full p-4 flex items-center gap-3 text-left hover:bg-red-50/50 transition-colors text-red-600"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="font-bold text-sm">Sign Out</span>
                  </button>

                </div>
              </>
            )}

            {/* SUBVIEW 2: STAFF LIST (Mockup: media_1792221587301_8aaa0f40.png) */}
            {settingsSubView === 'staff' && (
              <div className="flex flex-col w-full animate-fadeIn">
                
                {/* Back to Settings link */}
                <button
                  type="button"
                  onClick={() => setSettingsSubView('root')}
                  className="flex items-center gap-1 text-[#0d6efd] font-semibold text-sm hover:underline mb-1"
                >
                  <ChevronLeft className="w-5 h-5 -ml-1 stroke-[2.2]" />
                  Settings
                </button>

                {/* Header with + Add */}
                <div className="flex items-center justify-between mt-1 mb-3">
                  <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">
                    Staff
                  </h1>
                  <button
                    type="button"
                    onClick={openNewStaffModal}
                    className="text-[#0d6efd] font-bold text-base hover:underline flex items-center gap-0.5"
                  >
                    + Add
                  </button>
                </div>

                {/* Grouped Staff Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-zinc-200/60 overflow-hidden divide-y divide-zinc-100">
                  {staff.map(member => {
                    const isOwner = member.id === 'staff-1' || member.name.toLowerCase().includes('didula');
                    const initial = member.name.charAt(0).toUpperCase();

                    return (
                      <div
                        key={member.id}
                        onClick={() => openEditStaffModal(member)}
                        className="w-full p-3.5 flex items-center justify-between hover:bg-zinc-50/80 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          {/* Round Avatar Circle */}
                          <div className="w-11 h-11 rounded-full bg-[#dbeafe] text-[#0d6efd] font-extrabold text-lg flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-zinc-200/80">
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

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-base text-zinc-900 truncate">
                                {member.name}
                              </h4>
                              {isOwner && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fef3c7] text-[#92400e]">
                                  Owner
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-zinc-500 font-medium block">
                              {isOwner ? 'Admin' : (member.role || 'Stylist')}
                            </span>
                          </div>
                        </div>

                        <ChevronRight className="w-5 h-5 text-zinc-400 shrink-0 ml-2" />
                      </div>
                    );
                  })}
                </div>

                {/* Footer instructions */}
                <p className="text-xs text-zinc-500 font-medium px-2 mt-3 leading-relaxed">
                  Tap a person to change their role or PIN, or to deactivate them.
                </p>

              </div>
            )}

            {/* SUBVIEW 3: SERVICES LIST (Mockup: media_1792221587304_f638ca86.png) */}
            {settingsSubView === 'services' && (
              <div className="flex flex-col w-full animate-fadeIn">
                
                {/* Back to Settings link */}
                <button
                  type="button"
                  onClick={() => setSettingsSubView('root')}
                  className="flex items-center gap-1 text-[#0d6efd] font-semibold text-sm hover:underline mb-1"
                >
                  <ChevronLeft className="w-5 h-5 -ml-1 stroke-[2.2]" />
                  Settings
                </button>

                {/* Header with + Add */}
                <div className="flex items-center justify-between mt-1 mb-3">
                  <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">
                    Services
                  </h1>
                  <button
                    type="button"
                    onClick={openNewServiceModal}
                    className="text-[#0d6efd] font-bold text-base hover:underline flex items-center gap-0.5"
                  >
                    + Add
                  </button>
                </div>

                {/* Grouped Services Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-zinc-200/60 overflow-hidden divide-y divide-zinc-100">
                  {services.map(srv => {
                    const isServiceActive = srv.active !== false;

                    return (
                      <div
                        key={srv.id}
                        onClick={() => openEditServiceModal(srv)}
                        className="w-full p-4 flex items-center justify-between gap-3 hover:bg-zinc-50/80 cursor-pointer transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-base text-zinc-900 leading-snug truncate">
                            {srv.name}
                          </h4>
                          <p className="text-xs text-zinc-500 font-medium mt-0.5">
                            {srv.durationMinutes} min · Rs. {srv.price.toLocaleString()}
                          </p>
                        </div>

                        {/* iOS Toggle Switch */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleServiceActive(srv.id, e)}
                          className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
                            isServiceActive ? 'bg-[#198754]' : 'bg-zinc-300'
                          }`}
                        >
                          <span 
                            className={`block w-6 h-6 rounded-full bg-white shadow-md transform transition-transform ${
                              isServiceActive ? 'translate-x-[22px]' : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Footer instructions */}
                <p className="text-xs text-zinc-500 font-medium px-2 mt-3 leading-relaxed">
                  Switch a service off to hide it from client booking. Only the owner can add or edit services.
                </p>

              </div>
            )}

            {/* SUBVIEW 4: ANALYTICS */}
            {settingsSubView === 'analytics' && (
              <div className="flex flex-col w-full animate-fadeIn">
                <button
                  type="button"
                  onClick={() => setSettingsSubView('root')}
                  className="flex items-center gap-1 text-[#0d6efd] font-semibold text-sm hover:underline mb-1"
                >
                  <ChevronLeft className="w-5 h-5 -ml-1 stroke-[2.2]" />
                  Settings
                </button>

                <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 mt-1 mb-3">
                  Analytics
                </h1>

                {/* Overview Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-200/60">
                    <span className="text-xs font-semibold text-zinc-500 block">All-time Revenue</span>
                    <span className="text-xl font-black text-zinc-900 mt-1 block">
                      Rs. {appointments.filter(a => a.status === 'completed' || a.status === 'confirmed').reduce((sum, a) => sum + a.servicePrice, 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-200/60">
                    <span className="text-xs font-semibold text-zinc-500 block">Total Appointments</span>
                    <span className="text-xl font-black text-zinc-900 mt-1 block">
                      {appointments.length}
                    </span>
                  </div>
                </div>

                {/* Stylist Breakdown */}
                <span className="text-xs font-bold text-zinc-400 tracking-wider uppercase mt-5 mb-2 block px-1">
                  STYLIST BREAKDOWN
                </span>
                <div className="bg-white rounded-2xl shadow-sm border border-zinc-200/60 overflow-hidden divide-y divide-zinc-100">
                  {staff.map(st => {
                    const staffApts = appointments.filter(a => 
                      a.staffId === st.id || a.staffName.toLowerCase().includes(st.name.toLowerCase())
                    );
                    const staffRev = staffApts
                      .filter(a => a.status === 'completed' || a.status === 'confirmed')
                      .reduce((sum, a) => sum + a.servicePrice, 0);

                    return (
                      <div key={st.id} className="p-3.5 flex items-center justify-between">
                        <div>
                          <h5 className="font-bold text-sm text-zinc-900">{st.name}</h5>
                          <span className="text-xs text-zinc-500">{staffApts.length} bookings</span>
                        </div>
                        <span className="font-bold text-sm text-zinc-900">
                          Rs. {staffRev.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>

              </div>
            )}

          </div>
        )}

      </div>

      {/* ----------------- FIXED BOTTOM NAVIGATION BAR ----------------- */}
      <nav 
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-zinc-200/80"
      >
        <div className="w-full max-w-md mx-auto grid grid-cols-4 py-2 px-2 text-center select-none">
          
          {/* 1. Queue */}
          <button
            type="button"
            onClick={() => setActiveTab('queue')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-colors ${
              activeTab === 'queue' ? 'text-[#0d6efd]' : 'text-zinc-600 hover:text-zinc-800'
            }`}
          >
            <ListOrdered className="w-5 h-5 stroke-[2.2]" />
            <span className={`text-[11px] mt-1 ${activeTab === 'queue' ? 'font-bold' : 'font-medium'}`}>
              Queue
            </span>
          </button>

          {/* 2. Calendar */}
          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-colors ${
              activeTab === 'calendar' ? 'text-[#0d6efd]' : 'text-zinc-600 hover:text-zinc-800'
            }`}
          >
            <CalendarIcon className="w-5 h-5 stroke-[2.2]" />
            <span className={`text-[11px] mt-1 ${activeTab === 'calendar' ? 'font-bold' : 'font-medium'}`}>
              Calendar
            </span>
          </button>

          {/* 3. Clients */}
          <button
            type="button"
            onClick={() => setActiveTab('clients')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-colors ${
              activeTab === 'clients' ? 'text-[#0d6efd]' : 'text-zinc-600 hover:text-zinc-800'
            }`}
          >
            <Users className="w-5 h-5 stroke-[2.2]" />
            <span className={`text-[11px] mt-1 ${activeTab === 'clients' ? 'font-bold' : 'font-medium'}`}>
              Clients
            </span>
          </button>

          {/* 4. Settings */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('settings');
              setSettingsSubView('root');
            }}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-colors ${
              activeTab === 'settings' ? 'text-[#0d6efd]' : 'text-zinc-600 hover:text-zinc-800'
            }`}
          >
            <SlidersHorizontal className="w-5 h-5 stroke-[2.2]" />
            <span className={`text-[11px] mt-1 ${activeTab === 'settings' ? 'font-bold' : 'font-medium'}`}>
              Settings
            </span>
          </button>

        </div>
      </nav>

      {/* ----------------- MODAL: NEW / EDIT STAFF MEMBER (Mockup: media_1792221587301_a0475a0f.png) ----------------- */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-[#f0f2f6] w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3.5 bg-white border-b border-zinc-200/80 sticky top-0 z-10">
              <button
                type="button"
                onClick={() => setShowStaffModal(false)}
                className="text-[#0d6efd] font-semibold text-base hover:underline"
              >
                Cancel
              </button>
              <h3 className="font-bold text-base text-zinc-900">
                {editingStaff ? 'Edit staff member' : 'New staff member'}
              </h3>
              <button
                type="button"
                onClick={handleSaveStaff}
                className="text-[#0d6efd] font-bold text-base hover:underline"
              >
                Save
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="p-4 space-y-5">
              
              {/* Photo Area */}
              <div className="flex flex-col items-center justify-center py-2">
                <input
                  type="file"
                  ref={staffFileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleStaffPhotoChange}
                />
                <div
                  onClick={() => staffFileInputRef.current?.click()}
                  className="w-20 h-20 rounded-full flex flex-col items-center justify-center font-bold shadow-inner relative group cursor-pointer overflow-hidden transition-transform active:scale-95"
                >
                  {staffFormAvatar ? (
                    <>
                      <img
                        src={staffFormAvatar}
                        alt="Staff avatar"
                        className="w-full h-full object-cover rounded-full"
                      />
                      <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-full">
                        <Camera className="w-6 h-6 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full bg-[#dbeafe] text-[#0d6efd] flex flex-col items-center justify-center rounded-full hover:bg-blue-100 transition-colors">
                      {isProcessingStaffPhoto ? (
                        <div className="w-6 h-6 border-2 border-[#0d6efd] border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Plus className="w-8 h-8 stroke-[2.5]" />
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => staffFileInputRef.current?.click()}
                    className="text-xs font-bold text-[#0d6efd] hover:underline"
                    disabled={isProcessingStaffPhoto}
                  >
                    {isProcessingStaffPhoto ? 'Uploading...' : staffFormAvatar ? 'Change photo' : 'Add photo'}
                  </button>
                  {staffFormAvatar && (
                    <>
                      <span className="text-zinc-300">·</span>
                      <button
                        type="button"
                        onClick={() => setStaffFormAvatar('')}
                        className="text-xs font-bold text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* DETAILS GROUP */}
              <div>
                <span className="text-xs font-bold text-zinc-400 tracking-wider uppercase block px-1 mb-1.5">
                  DETAILS
                </span>
                <div className="bg-white rounded-2xl shadow-sm border border-zinc-200/60 overflow-hidden divide-y divide-zinc-100">
                  
                  <div className="p-3.5 flex items-center justify-between">
                    <label className="text-sm font-bold text-zinc-900 w-28">Full name</label>
                    <input
                      type="text"
                      required
                      placeholder="Required"
                      value={staffFormName}
                      onChange={e => setStaffFormName(e.target.value)}
                      className="flex-1 text-right text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none"
                    />
                  </div>

                  <div className="p-3.5 flex items-center justify-between">
                    <label className="text-sm font-bold text-zinc-900 w-28">Phone</label>
                    <input
                      type="tel"
                      placeholder="07x xxx xxxx"
                      value={staffFormPhone}
                      onChange={e => setStaffFormPhone(e.target.value)}
                      className="flex-1 text-right text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none"
                    />
                  </div>

                  <div className="p-3.5 flex items-center justify-between">
                    <label className="text-sm font-bold text-zinc-900 w-28">Email</label>
                    <input
                      type="email"
                      placeholder="For email sign-in"
                      value={staffFormEmail}
                      onChange={e => setStaffFormEmail(e.target.value)}
                      className="flex-1 text-right text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none"
                    />
                  </div>

                </div>
              </div>

              {/* ACCESS GROUP */}
              <div>
                <span className="text-xs font-bold text-zinc-400 tracking-wider uppercase block px-1 mb-1.5">
                  ACCESS
                </span>
                <div className="bg-white rounded-2xl shadow-sm border border-zinc-200/60 overflow-hidden divide-y divide-zinc-100">
                  
                  {/* Role Switch */}
                  <div className="p-3 flex items-center justify-between">
                    <label className="text-sm font-bold text-zinc-900">Role</label>
                    <div className="bg-[#e2e5eb] p-0.5 rounded-lg flex items-center w-36">
                      <button
                        type="button"
                        onClick={() => setStaffFormRole('Stylist')}
                        className={`flex-1 py-1 rounded-md text-xs font-bold text-center transition-all ${
                          staffFormRole === 'Stylist' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600'
                        }`}
                      >
                        Stylist
                      </button>
                      <button
                        type="button"
                        onClick={() => setStaffFormRole('Admin')}
                        className={`flex-1 py-1 rounded-md text-xs font-bold text-center transition-all ${
                          staffFormRole === 'Admin' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600'
                        }`}
                      >
                        Admin
                      </button>
                    </div>
                  </div>

                  {/* PIN */}
                  <div className="p-3.5 flex items-center justify-between">
                    <label className="text-sm font-bold text-zinc-900">Sign-in PIN</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="password"
                        maxLength={4}
                        placeholder="4 digits"
                        value={staffFormPin}
                        onChange={e => setStaffFormPin(e.target.value.replace(/\D/g, ''))}
                        className="w-20 text-right text-sm text-zinc-900 placeholder-zinc-400 font-mono tracking-widest focus:outline-none"
                      />
                      <ChevronRight className="w-4 h-4 text-zinc-400" />
                    </div>
                  </div>

                  {/* Services offered */}
                  <div className="p-3.5 flex items-center justify-between">
                    <label className="text-sm font-bold text-zinc-900">Services offered</label>
                    <div className="flex items-center gap-1 text-zinc-500 text-sm">
                      <span>All services</span>
                      <ChevronRight className="w-4 h-4 text-zinc-400" />
                    </div>
                  </div>

                  {/* Active Toggle */}
                  <div className="p-3.5 flex items-center justify-between">
                    <label className="text-sm font-bold text-zinc-900">Active</label>
                    <button
                      type="button"
                      onClick={() => setStaffFormActive(!staffFormActive)}
                      className={`relative w-12 h-7 rounded-full transition-colors ${
                        staffFormActive ? 'bg-[#198754]' : 'bg-zinc-300'
                      }`}
                    >
                      <span 
                        className={`block w-6 h-6 rounded-full bg-white shadow-md transform transition-transform ${
                          staffFormActive ? 'translate-x-[22px]' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                </div>
              </div>

              {/* Delete Button (if editing existing and not owner) */}
              {editingStaff && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => handleDeleteStaff(editingStaff.id)}
                    className="w-full py-3 bg-red-50 text-red-600 rounded-2xl font-bold text-sm hover:bg-red-100 transition-colors"
                  >
                    Delete staff member
                  </button>
                </div>
              )}

            </form>

          </div>
        </div>
      )}

      {/* ----------------- MODAL: NEW / EDIT SERVICE (Mockup: media_1792221587302_749386f3.png) ----------------- */}
      {showServiceModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-[#f0f2f6] w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3.5 bg-white border-b border-zinc-200/80 sticky top-0 z-10">
              <button
                type="button"
                onClick={() => setShowServiceModal(false)}
                className="text-[#0d6efd] font-semibold text-base hover:underline"
              >
                Cancel
              </button>
              <h3 className="font-bold text-base text-zinc-900">
                {editingService ? 'Edit service' : 'New service'}
              </h3>
              <button
                type="button"
                onClick={handleSaveService}
                className="text-[#0d6efd] font-bold text-base hover:underline"
              >
                Save
              </button>
            </div>

            <form onSubmit={handleSaveService} className="p-4 space-y-5">
              
              {/* DETAILS GROUP */}
              <div>
                <span className="text-xs font-bold text-zinc-400 tracking-wider uppercase block px-1 mb-1.5">
                  DETAILS
                </span>
                <div className="bg-white rounded-2xl shadow-sm border border-zinc-200/60 overflow-hidden divide-y divide-zinc-100">
                  
                  <div className="p-3.5 flex items-center justify-between">
                    <label className="text-sm font-bold text-zinc-900 w-28">Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Classic Haircut"
                      value={serviceFormName}
                      onChange={e => setServiceFormName(e.target.value)}
                      className="flex-1 text-right text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none"
                    />
                  </div>

                  <div className="p-3.5 flex items-center justify-between">
                    <label className="text-sm font-bold text-zinc-900 w-28">Price (Rs.)</label>
                    <input
                      type="number"
                      required
                      placeholder="0"
                      value={serviceFormPrice}
                      onChange={e => setServiceFormPrice(e.target.value)}
                      className="flex-1 text-right text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none"
                    />
                  </div>

                  <div className="p-3.5 flex items-center justify-between">
                    <label className="text-sm font-bold text-zinc-900 w-28">Duration</label>
                    <div className="flex items-center gap-1">
                      <select
                        value={serviceFormDuration}
                        onChange={e => setServiceFormDuration(e.target.value)}
                        className="bg-transparent text-right text-sm text-zinc-900 font-semibold focus:outline-none cursor-pointer"
                      >
                        <option value="15">15 min</option>
                        <option value="30">30 min</option>
                        <option value="45">45 min</option>
                        <option value="60">60 min</option>
                        <option value="90">90 min</option>
                        <option value="120">120 min</option>
                      </select>
                      <ChevronRight className="w-4 h-4 text-zinc-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="p-3.5 flex items-center justify-between">
                    <label className="text-sm font-bold text-zinc-900 w-28">Description</label>
                    <input
                      type="text"
                      placeholder="Optional"
                      value={serviceFormDescription}
                      onChange={e => setServiceFormDescription(e.target.value)}
                      className="flex-1 text-right text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none"
                    />
                  </div>

                </div>
              </div>

              {/* AVAILABILITY GROUP */}
              <div>
                <span className="text-xs font-bold text-zinc-400 tracking-wider uppercase block px-1 mb-1.5">
                  AVAILABILITY
                </span>
                <div className="bg-white rounded-2xl shadow-sm border border-zinc-200/60 overflow-hidden divide-y divide-zinc-100">
                  
                  <div className="p-3.5 flex items-center justify-between">
                    <label className="text-sm font-bold text-zinc-900">Offered by</label>
                    <div className="flex items-center gap-1 text-zinc-500 text-sm">
                      <span>All staff</span>
                      <ChevronRight className="w-4 h-4 text-zinc-400" />
                    </div>
                  </div>

                  <div className="p-3.5 flex items-center justify-between">
                    <label className="text-sm font-bold text-zinc-900">Show in client booking</label>
                    <button
                      type="button"
                      onClick={() => setServiceFormActive(!serviceFormActive)}
                      className={`relative w-12 h-7 rounded-full transition-colors ${
                        serviceFormActive ? 'bg-[#198754]' : 'bg-zinc-300'
                      }`}
                    >
                      <span 
                        className={`block w-6 h-6 rounded-full bg-white shadow-md transform transition-transform ${
                          serviceFormActive ? 'translate-x-[22px]' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                </div>
              </div>

              {/* Delete Button (if editing) */}
              {editingService && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => handleDeleteService(editingService.id)}
                    className="w-full py-3 bg-red-50 text-red-600 rounded-2xl font-bold text-sm hover:bg-red-100 transition-colors"
                  >
                    Delete service
                  </button>
                </div>
              )}

            </form>

          </div>
        </div>
      )}

      {/* ----------------- ACTION SHEET: APPOINTMENT MORE OPTIONS ----------------- */}
      {actionAppointment && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl p-4 space-y-3">
            <div className="text-center pb-2 border-b border-zinc-100">
              <h4 className="font-bold text-base text-zinc-900">{actionAppointment.customerName}</h4>
              <p className="text-xs text-zinc-500">{actionAppointment.serviceName} · {actionAppointment.timeSlot}</p>
            </div>

            <div className="space-y-2">
              <a
                href={`tel:${actionAppointment.customerPhone}`}
                className="w-full py-3 px-4 rounded-xl bg-blue-50 text-[#0d6efd] font-bold text-sm flex items-center justify-center gap-2"
              >
                <Phone className="w-4 h-4" /> Call {actionAppointment.customerPhone}
              </a>

              {actionAppointment.status !== 'completed' && (
                <button
                  type="button"
                  onClick={() => {
                    handleUpdateStatus(actionAppointment.id, 'completed');
                    setActionAppointment(null);
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-sm flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" /> Mark as Completed
                </button>
              )}

              <button
                type="button"
                onClick={() => handleDeleteAppointment(actionAppointment.id)}
                className="w-full py-3 px-4 rounded-xl bg-red-50 text-red-600 font-bold text-sm flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Delete appointment
              </button>
            </div>

            <button
              type="button"
              onClick={() => setActionAppointment(null)}
              className="w-full py-3 bg-zinc-100 text-zinc-700 font-bold text-sm rounded-xl mt-2"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ----------------- ACTION SHEET: TOP PROFILE MENU ----------------- */}
      {showProfileMenu && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-zinc-100">
              <div className="w-12 h-12 rounded-full bg-[#0d6efd] text-white font-extrabold text-xl flex items-center justify-center shadow-md overflow-hidden ring-1 ring-zinc-200/80">
                {activeUser.avatar ? (
                  <img
                    src={activeUser.avatar}
                    alt={activeUser.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : null}
                <span className={activeUser.avatar ? 'sr-only' : 'block'}>
                  {activeUser.name.charAt(0)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-base text-zinc-900 truncate">{activeUser.name}</h4>
                <p className="text-xs text-zinc-500 truncate">{activeUser.title || activeUser.role} · {activeUser.email}</p>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setShowProfileMenu(false);
                  const me = staff.find(s => s.id === activeUser.id);
                  if (me) openEditStaffModal(me);
                }}
                className="w-full py-3 px-4 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0d6efd] font-bold text-sm flex items-center gap-3 text-left transition-colors"
              >
                <Camera className="w-4 h-4" /> Edit Profile & Photo
              </button>

              {onExitToClientWebsite && (
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    onExitToClientWebsite();
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-sm flex items-center gap-3 text-left transition-colors"
                >
                  <Globe className="w-4 h-4 text-[#0d6efd]" /> Client Booking Website
                </button>
              )}

              {onLockPortal && (
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    onLockPortal();
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-sm flex items-center gap-3 text-left transition-colors"
                >
                  <Lock className="w-4 h-4 text-zinc-600" /> Lock Portal (Require PIN)
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Sign out of staff portal?')) {
                    localStorage.removeItem('aquiness_staff_auth');
                    if (onLockPortal) onLockPortal();
                  }
                }}
                className="w-full py-3 px-4 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-sm flex items-center gap-3 text-left transition-colors"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowProfileMenu(false)}
              className="w-full py-3 bg-zinc-100 text-zinc-700 font-bold text-sm rounded-xl mt-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* iOS / Mobile App Install Modal */}
      {showInstallGuide && (
        <IosInstallModal onClose={() => setShowInstallGuide(false)} />
      )}

    </div>
  );
};
