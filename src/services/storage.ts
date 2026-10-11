import { SalonService, StaffMember, Appointment, AppointmentStatus } from '../types';
import { INITIAL_SERVICES, INITIAL_STAFF, INITIAL_APPOINTMENTS } from '../data/mockData';

const STORAGE_KEYS = {
  SERVICES: 'didula_services_v1',
  STAFF: 'didula_staff_v1',
  APPOINTMENTS: 'didula_appointments_v1',
};

// Helpers for safe storage access
function getItem<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    if (!data) return fallback;
    return JSON.parse(data) as T;
  } catch (e) {
    console.warn(`Error reading localStorage for key ${key}:`, e);
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event('didula_storage_update'));
  } catch (e) {
    console.error(`Error saving localStorage for key ${key}:`, e);
  }
}

export const StorageService = {
  // Services
  getServices(): SalonService[] {
    const list = getItem<SalonService[]>(STORAGE_KEYS.SERVICES, []);
    if (!list || list.length === 0) {
      setItem(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
      return INITIAL_SERVICES;
    }
    return list;
  },

  addOrUpdateService(service: SalonService): SalonService[] {
    const current = this.getServices();
    const idx = current.findIndex(s => s.id === service.id);
    let updated: SalonService[];
    if (idx >= 0) {
      updated = [...current];
      updated[idx] = service;
    } else {
      updated = [service, ...current];
    }
    setItem(STORAGE_KEYS.SERVICES, updated);
    return updated;
  },

  deleteService(serviceId: string): SalonService[] {
    const current = this.getServices();
    const updated = current.filter(s => s.id !== serviceId);
    setItem(STORAGE_KEYS.SERVICES, updated);
    return updated;
  },

  // Staff
  getStaff(): StaffMember[] {
    const list = getItem<StaffMember[]>(STORAGE_KEYS.STAFF, []);
    if (!list || list.length === 0) {
      setItem(STORAGE_KEYS.STAFF, INITIAL_STAFF);
      return INITIAL_STAFF;
    }
    return list;
  },

  toggleStaffAvailability(staffId: string): StaffMember[] {
    const current = this.getStaff();
    const updated = current.map(st => 
      st.id === staffId ? { ...st, available: !st.available } : st
    );
    setItem(STORAGE_KEYS.STAFF, updated);
    return updated;
  },

  // Appointments
  getAppointments(): Appointment[] {
    const list = getItem<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, []);
    if (!list || list.length === 0) {
      setItem(STORAGE_KEYS.APPOINTMENTS, INITIAL_APPOINTMENTS);
      return INITIAL_APPOINTMENTS;
    }
    return list;
  },

  createAppointment(aptData: Omit<Appointment, 'id' | 'createdAt' | 'status'> & { status?: AppointmentStatus }): Appointment {
    const current = this.getAppointments();
    const newApt: Appointment = {
      ...aptData,
      id: `apt-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      status: aptData.status || 'pending',
      createdAt: new Date().toISOString()
    };
    const updated = [newApt, ...current];
    setItem(STORAGE_KEYS.APPOINTMENTS, updated);
    return newApt;
  },

  updateAppointmentStatus(id: string, newStatus: AppointmentStatus): Appointment[] {
    const current = this.getAppointments();
    const updated = current.map(a => a.id === id ? { ...a, status: newStatus } : a);
    setItem(STORAGE_KEYS.APPOINTMENTS, updated);
    return updated;
  },

  deleteAppointment(id: string): Appointment[] {
    const current = this.getAppointments();
    const updated = current.filter(a => a.id !== id);
    setItem(STORAGE_KEYS.APPOINTMENTS, updated);
    return updated;
  },

  resetDemoData(): void {
    setItem(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
    setItem(STORAGE_KEYS.STAFF, INITIAL_STAFF);
    setItem(STORAGE_KEYS.APPOINTMENTS, INITIAL_APPOINTMENTS);
  }
};
