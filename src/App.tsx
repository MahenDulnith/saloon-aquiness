import React, { useState, useEffect, useCallback } from 'react';
import { CustomerApp } from './components/CustomerApp';
import { AdminPortal } from './components/AdminPortal';
import { StaffLogin } from './components/StaffLogin';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { StorageService } from './services/storage';
import { FirebaseService } from './services/firebaseService';
import { Appointment, SalonService, StaffMember, CurrentStaffUser } from './types';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'booking' | 'admin'>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      const search = window.location.search.toLowerCase();
      const path = window.location.pathname.toLowerCase();
      if (hash.includes('staff') || hash.includes('admin') || search.includes('staff') || search.includes('admin') || path.includes('/staff')) {
        return 'admin';
      }
    }
    return 'booking';
  });

  const handleViewChange = (view: 'booking' | 'admin') => {
    setCurrentView(view);
    if (typeof window !== 'undefined') {
      if (view === 'admin') {
        if (window.location.pathname !== '/staff' && window.location.pathname !== '/staff/') {
          try {
            window.history.pushState(null, '', '/staff');
          } catch {
            window.location.hash = 'staff';
          }
        }
      } else {
        if (window.location.pathname.includes('/staff')) {
          try {
            window.history.pushState(null, '', '/');
          } catch {
            window.location.hash = '';
          }
        } else if (window.location.hash === '#staff' || window.location.hash === '#admin') {
          history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      }
    }
  };

  // Sync browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash.toLowerCase();
      const path = window.location.pathname.toLowerCase();
      if (hash.includes('staff') || hash.includes('admin') || path.includes('/staff')) {
        setCurrentView('admin');
      } else {
        setCurrentView('booking');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Synchronize manifest, document title, and meta title dynamically based on view
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
      const appleTitleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]') as HTMLMetaElement | null;

      if (currentView === 'admin') {
        document.title = 'Aquiness Staff | Salon Portal';
        if (manifestLink) {
          manifestLink.href = '/manifest-staff.json?v=3';
        }
        if (appleTitleMeta) {
          appleTitleMeta.content = 'Aquiness Staff';
        }
        if (window.location.pathname !== '/staff' && window.location.pathname !== '/staff/') {
          try {
            window.history.replaceState(null, '', '/staff');
          } catch {}
        }
      } else {
        document.title = 'Aquiness Barber | Professional Saloon (Pallewela)';
        if (manifestLink) {
          manifestLink.href = '/manifest.json?v=3';
        }
        if (appleTitleMeta) {
          appleTitleMeta.content = 'Aquiness';
        }
        if (window.location.pathname.includes('/staff')) {
          try {
            window.history.replaceState(null, '', '/');
          } catch {}
        }
      }
    }
  }, [currentView]);

  const [currentStaffUser, setCurrentStaffUser] = useState<CurrentStaffUser | null>(() => {
    try {
      const saved = localStorage.getItem('aquiness_staff_auth');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      if (parsed.authenticated && (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000)) {
        if (parsed.user) {
          const cleanAvatar = parsed.user.avatar && !parsed.user.avatar.includes('unsplash.com') ? parsed.user.avatar : '';
          return {
            ...parsed.user,
            avatar: cleanAvatar
          };
        }
        return {
          id: 'staff-1',
          name: 'Didula Perera',
          role: 'admin',
          title: 'Founder & Master Stylist',
          avatar: ''
        };
      }
      return null;
    } catch {
      return null;
    }
  });
  const [services, setServices] = useState<SalonService[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  // Load data
  const loadData = useCallback(async () => {
    let fetchedStaffList: StaffMember[] = [];
    try {
      const [fetchedServices, fetchedStaff, fetchedApts] = await Promise.all([
        FirebaseService.getServices(),
        FirebaseService.getStaff(),
        FirebaseService.getAppointments()
      ]);
      setServices(fetchedServices);
      setStaff(fetchedStaff);
      setAppointments(fetchedApts);
      fetchedStaffList = fetchedStaff;
    } catch {
      const fallbackServices = StorageService.getServices();
      const fallbackStaff = StorageService.getStaff();
      const fallbackApts = StorageService.getAppointments();
      setServices(fallbackServices);
      setStaff(fallbackStaff);
      setAppointments(fallbackApts);
      fetchedStaffList = fallbackStaff;
    }

    // Keep logged-in currentStaffUser synced with updated staff profile/avatar
    setCurrentStaffUser(prev => {
      if (!prev) return null;
      const match = fetchedStaffList.find(s => s.id === prev.id || s.name.toLowerCase() === prev.name.toLowerCase());
      if (match) {
        const cleanMatchAvatar = match.avatar && !match.avatar.includes('unsplash.com') ? match.avatar : '';
        const cleanPrevAvatar = prev.avatar && !prev.avatar.includes('unsplash.com') ? prev.avatar : '';
        const updated = {
          ...prev,
          name: match.name,
          avatar: cleanMatchAvatar || cleanPrevAvatar || '',
          title: match.role || prev.title,
          email: match.email || prev.email
        };
        try {
          localStorage.setItem('aquiness_staff_auth', JSON.stringify({
            authenticated: true,
            timestamp: Date.now(),
            user: updated
          }));
        } catch {}
        return updated;
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    // Initial load and seed
    FirebaseService.initializeDatabase().then(() => loadData());

    // Real-time listener for live updates across all devices
    const unsubAppointments = FirebaseService.subscribeToAppointments((liveApts) => {
      setAppointments(liveApts);
      StorageService.setAppointments(liveApts);
    });

    const unsubStaff = FirebaseService.subscribeToStaff((liveStaff) => {
      setStaff(liveStaff);
      StorageService.setStaff(liveStaff);
    });

    // Listen to local storage events
    const handleStorageUpdate = () => {
      loadData();
    };

    window.addEventListener('didula_storage_update', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);

    return () => {
      unsubAppointments();
      unsubStaff();
      window.removeEventListener('didula_storage_update', handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, [loadData]);

  const isAdminPortalActive = currentView === 'admin' && !!currentStaffUser;

  useEffect(() => {
    if (isAdminPortalActive) {
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) {
        metaTheme.setAttribute('content', '#f0f2f6');
      }
    }
  }, [isAdminPortalActive]);

  return (
    <div className={`min-h-screen flex flex-col justify-between selection:bg-amber-500 selection:text-zinc-950 ${
      isAdminPortalActive ? 'bg-[#f0f2f6] text-zinc-900' : 'bg-transparent'
    }`}>
      {currentView === 'booking' ? (
        <>
          <CustomerApp 
            services={services}
            staff={staff}
            appointments={appointments}
            onAppointmentCreated={loadData}
            onGoToStaffPortal={() => handleViewChange('admin')}
          />
          <PWAInstallBanner />
        </>
      ) : !currentStaffUser ? (
        <StaffLogin
          staffList={staff}
          onSuccess={(user) => setCurrentStaffUser(user)}
          onCancel={() => handleViewChange('booking')}
        />
      ) : (
        <AdminPortal
          currentUser={currentStaffUser}
          appointments={appointments}
          services={services}
          staff={staff}
          onAppointmentsUpdated={loadData}
          onServicesUpdated={loadData}
          onStaffUpdated={loadData}
          onCurrentUserUpdated={setCurrentStaffUser}
          onExitToClientWebsite={() => handleViewChange('booking')}
          onLockPortal={() => {
            localStorage.removeItem('aquiness_staff_auth');
            setCurrentStaffUser(null);
            handleViewChange('booking');
          }}
        />
      )}
    </div>
  );
};

export default App;
