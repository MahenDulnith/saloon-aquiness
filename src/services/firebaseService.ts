import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  serverTimestamp
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "../firebase/config";
import { Appointment, SalonService, StaffMember, AppointmentStatus } from "../types";
import { INITIAL_SERVICES, INITIAL_STAFF, INITIAL_APPOINTMENTS } from "../data/mockData";
import { StorageService } from "./storage";

const COLLECTIONS = {
  SERVICES: "services",
  STAFF: "staff",
  APPOINTMENTS: "appointments",
};

export const FirebaseService = {
  // Sync & Seed
  async initializeDatabase(): Promise<void> {
    if (!isFirebaseConfigured()) return;

    try {
      // Check if services exists
      const servicesSnap = await getDocs(collection(db, COLLECTIONS.SERVICES));
      if (servicesSnap.empty) {
        console.log("Seeding initial services to Cloud Firestore...");
        for (const s of INITIAL_SERVICES) {
          await setDoc(doc(db, COLLECTIONS.SERVICES, s.id), s);
        }
      }

      // Check if staff exists
      const staffSnap = await getDocs(collection(db, COLLECTIONS.STAFF));
      if (staffSnap.empty) {
        console.log("Seeding initial staff to Cloud Firestore...");
        for (const st of INITIAL_STAFF) {
          await setDoc(doc(db, COLLECTIONS.STAFF, st.id), st);
        }
      }

      // Check if appointments exists
      const aptSnap = await getDocs(collection(db, COLLECTIONS.APPOINTMENTS));
      if (aptSnap.empty) {
        console.log("Seeding sample appointments to Cloud Firestore...");
        for (const a of INITIAL_APPOINTMENTS) {
          await setDoc(doc(db, COLLECTIONS.APPOINTMENTS, a.id), a);
        }
      }
    } catch (error) {
      console.warn("Firestore initialize error (falling back to local cache):", error);
    }
  },

  // Services
  async getServices(): Promise<SalonService[]> {
    if (!isFirebaseConfigured()) return StorageService.getServices();

    try {
      const snap = await getDocs(collection(db, COLLECTIONS.SERVICES));
      if (snap.empty) {
        await this.initializeDatabase();
        return StorageService.getServices();
      }
      const services = snap.docs.map(d => d.data() as SalonService);
      return services;
    } catch (e) {
      console.warn("Error fetching services from Firestore, using local cache:", e);
      return StorageService.getServices();
    }
  },

  async addOrUpdateService(service: SalonService): Promise<void> {
    StorageService.addOrUpdateService(service);
    if (!isFirebaseConfigured()) return;

    try {
      await setDoc(doc(db, COLLECTIONS.SERVICES, service.id), service);
    } catch (e) {
      console.error("Firestore error updating service:", e);
    }
  },

  async deleteService(serviceId: string): Promise<void> {
    StorageService.deleteService(serviceId);
    if (!isFirebaseConfigured()) return;

    try {
      await deleteDoc(doc(db, COLLECTIONS.SERVICES, serviceId));
    } catch (e) {
      console.error("Firestore error deleting service:", e);
    }
  },

  // Staff
  async getStaff(): Promise<StaffMember[]> {
    if (!isFirebaseConfigured()) return StorageService.getStaff();

    try {
      const snap = await getDocs(collection(db, COLLECTIONS.STAFF));
      if (snap.empty) {
        await this.initializeDatabase();
        return StorageService.getStaff();
      }
      return snap.docs.map(d => d.data() as StaffMember);
    } catch (e) {
      console.warn("Error fetching staff from Firestore, using local cache:", e);
      return StorageService.getStaff();
    }
  },

  async addOrUpdateStaff(staffMember: StaffMember): Promise<StaffMember[]> {
    const updated = StorageService.addOrUpdateStaff(staffMember);
    if (!isFirebaseConfigured()) return updated;

    try {
      await setDoc(doc(db, COLLECTIONS.STAFF, staffMember.id), staffMember);
    } catch (e) {
      console.error("Firestore error updating staff:", e);
    }
    return updated;
  },

  async deleteStaff(staffId: string): Promise<StaffMember[]> {
    const updated = StorageService.deleteStaff(staffId);
    if (!isFirebaseConfigured()) return updated;

    try {
      await deleteDoc(doc(db, COLLECTIONS.STAFF, staffId));
    } catch (e) {
      console.error("Firestore error deleting staff:", e);
    }
    return updated;
  },

  async toggleStaffAvailability(staffId: string): Promise<void> {
    const updated = StorageService.toggleStaffAvailability(staffId);
    if (!isFirebaseConfigured()) return;

    try {
      const target = updated.find(s => s.id === staffId);
      if (target) {
        await updateDoc(doc(db, COLLECTIONS.STAFF, staffId), {
          available: target.available
        });
      }
    } catch (e) {
      console.error("Firestore error updating staff availability:", e);
    }
  },

  // Appointments
  async getAppointments(): Promise<Appointment[]> {
    if (!isFirebaseConfigured()) return StorageService.getAppointments();

    try {
      const q = query(collection(db, COLLECTIONS.APPOINTMENTS), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      if (snap.empty) {
        await this.initializeDatabase();
        return StorageService.getAppointments();
      }
      return snap.docs.map(d => d.data() as Appointment);
    } catch (e) {
      console.warn("Error reading appointments from Firestore, using local cache:", e);
      return StorageService.getAppointments();
    }
  },

  async createAppointment(aptData: Omit<Appointment, 'id' | 'createdAt' | 'status'> & { status?: AppointmentStatus }): Promise<Appointment> {
    const localApt = StorageService.createAppointment(aptData);
    if (!isFirebaseConfigured()) return localApt;

    try {
      await setDoc(doc(db, COLLECTIONS.APPOINTMENTS, localApt.id), {
        ...localApt,
        firestoreTimestamp: serverTimestamp()
      });
    } catch (e) {
      console.error("Firestore error saving appointment:", e);
    }
    return localApt;
  },

  async updateAppointmentStatus(id: string, newStatus: AppointmentStatus): Promise<void> {
    StorageService.updateAppointmentStatus(id, newStatus);
    if (!isFirebaseConfigured()) return;

    try {
      await updateDoc(doc(db, COLLECTIONS.APPOINTMENTS, id), {
        status: newStatus
      });
    } catch (e) {
      console.error("Firestore error updating appointment status:", e);
    }
  },

  async deleteAppointment(id: string): Promise<void> {
    StorageService.deleteAppointment(id);
    if (!isFirebaseConfigured()) return;

    try {
      await deleteDoc(doc(db, COLLECTIONS.APPOINTMENTS, id));
    } catch (e) {
      console.error("Firestore error deleting appointment:", e);
    }
  },

  // Real-time listener for live sync
  subscribeToAppointments(onUpdate: (appointments: Appointment[]) => void): () => void {
    if (!isFirebaseConfigured()) {
      return () => {};
    }

    try {
      const q = query(collection(db, COLLECTIONS.APPOINTMENTS), orderBy("createdAt", "desc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map(d => d.data() as Appointment);
          onUpdate(list);
        }
      }, (err) => {
        console.warn("Real-time listener note (offline or permission):", err);
      });
      return unsubscribe;
    } catch (e) {
      console.warn("Failed to subscribe to appointments:", e);
      return () => {};
    }
  }
};
