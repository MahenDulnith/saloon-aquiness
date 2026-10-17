import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { BookingWizard } from './components/BookingWizard';
import { AdminPortal } from './components/AdminPortal';
import { StaffLogin } from './components/StaffLogin';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { Footer } from './components/Footer';
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
        window.location.hash = 'staff';
      } else {
        if (window.location.hash === '#staff' || window.location.hash === '#admin') {
          history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      }
    }
  };

  const [currentStaffUser, setCurrentStaffUser] = useState<CurrentStaffUser | null>(() => {
    try {
      const saved = localStorage.getItem('aquiness_staff_auth');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      if (parsed.authenticated && (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000)) {
        return parsed.user || {
          id: 'staff-1',
          name: 'Didula Perera',
          role: 'admin',
          title: 'Founder & Master Stylist',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'
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
        const updated = {
          ...prev,
          name: match.name,
          avatar: match.avatar || prev.avatar,
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
    const unsubscribe = FirebaseService.subscribeToAppointments((liveApts) => {
      setAppointments(liveApts);
    });

    // Listen to local storage events
    const handleStorageUpdate = () => {
      loadData();
    };

    window.addEventListener('didula_storage_update', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener('didula_storage_update', handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, [loadData]);

  const pendingAppointmentsCount = appointments.filter(a => a.status === 'pending').length;

  const handleStartBooking = () => {
    handleViewChange('booking');
    const bookingEl = document.getElementById('booking-section');
    if (bookingEl) {
      bookingEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between selection:bg-amber-500 selection:text-zinc-950">
      {currentView === 'booking' ? (
        <>
          <div>
            <Navbar 
              currentView={currentView}
              onViewChange={handleViewChange}
              onBookNowClick={handleStartBooking}
            />

            <main>
              <Hero onStartBooking={handleStartBooking} />
              <BookingWizard
                services={services}
                staff={staff}
                appointments={appointments}
                onAppointmentCreated={loadData}
                onGoToStaffPortal={() => handleViewChange('admin')}
              />
            </main>
          </div>

          <PWAInstallBanner />
          <Footer onOpenStaffPortal={() => handleViewChange('admin')} />
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
