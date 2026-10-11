import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { BookingWizard } from './components/BookingWizard';
import { AdminPortal } from './components/AdminPortal';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { Footer } from './components/Footer';
import { StorageService } from './services/storage';
import { FirebaseService } from './services/firebaseService';
import { Appointment, SalonService, StaffMember } from './types';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'booking' | 'admin'>('booking');
  const [services, setServices] = useState<SalonService[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  // Load data
  const loadData = useCallback(async () => {
    try {
      const [fetchedServices, fetchedStaff, fetchedApts] = await Promise.all([
        FirebaseService.getServices(),
        FirebaseService.getStaff(),
        FirebaseService.getAppointments()
      ]);
      setServices(fetchedServices);
      setStaff(fetchedStaff);
      setAppointments(fetchedApts);
    } catch {
      setServices(StorageService.getServices());
      setStaff(StorageService.getStaff());
      setAppointments(StorageService.getAppointments());
    }
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
    setCurrentView('booking');
    const bookingEl = document.getElementById('booking-section');
    if (bookingEl) {
      bookingEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between selection:bg-amber-500 selection:text-zinc-950">
      <div>
        <Navbar 
          currentView={currentView}
          onViewChange={setCurrentView}
          pendingCount={pendingAppointmentsCount}
        />

        <main>
          {currentView === 'booking' ? (
            <div>
              <Hero onStartBooking={handleStartBooking} />
              <BookingWizard
                services={services}
                staff={staff}
                appointments={appointments}
                onAppointmentCreated={loadData}
                onGoToStaffPortal={() => setCurrentView('admin')}
              />
            </div>
          ) : (
            <AdminPortal
              appointments={appointments}
              services={services}
              staff={staff}
              onAppointmentsUpdated={loadData}
              onServicesUpdated={loadData}
              onStaffUpdated={loadData}
            />
          )}
        </main>
      </div>

      <PWAInstallBanner />
      <Footer />
    </div>
  );
};

export default App;
