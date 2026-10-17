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
  serverTimestamp,
  addDoc
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

/**
 * Strips any undefined fields recursively so Firestore setDoc / updateDoc never rejects the payload
 */
function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data
      .filter(item => item !== undefined)
      .map(item => sanitizeForFirestore(item)) as any;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const clean: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        clean[key] = sanitizeForFirestore(value);
      }
    }
    return clean;
  }
  return data;
}

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
          await setDoc(doc(db, COLLECTIONS.SERVICES, s.id), sanitizeForFirestore(s));
        }
      }

      // Check if staff exists
      const staffSnap = await getDocs(collection(db, COLLECTIONS.STAFF));
      if (staffSnap.empty) {
        console.log("Seeding initial staff to Cloud Firestore...");
        for (const st of INITIAL_STAFF) {
          await setDoc(doc(db, COLLECTIONS.STAFF, st.id), sanitizeForFirestore(st));
        }
      }

      // Check if appointments exists
      const aptSnap = await getDocs(collection(db, COLLECTIONS.APPOINTMENTS));
      if (aptSnap.empty) {
        console.log("Seeding sample appointments to Cloud Firestore...");
        for (const a of INITIAL_APPOINTMENTS) {
          await setDoc(doc(db, COLLECTIONS.APPOINTMENTS, a.id), sanitizeForFirestore(a));
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
      await setDoc(doc(db, COLLECTIONS.SERVICES, service.id), sanitizeForFirestore(service));
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
      await setDoc(doc(db, COLLECTIONS.STAFF, staffMember.id), sanitizeForFirestore(staffMember));
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
  },

  // Security alert: sends email alert when someone accesses staff portal or fails login
  async sendStaffLoginAlert(reason: string = 'Secret 10-tap gesture on client profile', isUrgent: boolean = false): Promise<void> {
    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Colombo',
      dateStyle: 'full',
      timeStyle: 'medium'
    });
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown Device';
    const targetEmail = 'didula@saloonaquiness.lk';
    const isMultipleFail = isUrgent || reason.toLowerCase().includes('3+') || reason.toLowerCase().includes('failed');

    const emailSubject = isMultipleFail
      ? `🚨 URGENT: 3+ Failed Login Attempts Detected on Salon Portal`
      : `⚠️ Security Alert: Staff Portal Activity (${reason})`;

    // 1. Log to Firestore security_alerts
    try {
      if (isFirebaseConfigured()) {
        await addDoc(collection(db, 'security_alerts'), {
          event: isMultipleFail ? 'multiple_failed_logins' : 'staff_portal_access',
          reason,
          isUrgent: isMultipleFail,
          targetEmail,
          timestamp: new Date().toISOString(),
          formattedTime: timestamp,
          userAgent,
          source: 'salon_portal_auth'
        });

        // 2. Queue in Firestore 'mail' collection (Firebase Trigger Email extension)
        await addDoc(collection(db, 'mail'), {
          to: [targetEmail],
          message: {
            subject: emailSubject,
            text: `Alert: ${reason}\nTime: ${timestamp}\nDevice: ${userAgent}`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; padding: 24px; border: 2px solid ${isMultipleFail ? '#ef4444' : '#e4e4e7'}; border-radius: 16px;">
                <h2 style="color: ${isMultipleFail ? '#dc2626' : '#d97706'}; margin-top: 0;">
                  ${isMultipleFail ? '🚨 URGENT: Multiple Failed Sign-in Attempts' : '⚠️ Aquiness Barber Security Alert'}
                </h2>
                <p style="color: #3f3f46; font-size: 14px; line-height: 1.5;">
                  ${isMultipleFail 
                    ? 'Someone entered an <strong>incorrect PIN more than 3 times</strong> on the Staff Portal. The keypad has been temporarily locked to protect your account.'
                    : 'Someone accessed or interacted with the <strong>Staff Sign In Portal</strong>.'
                  }
                </p>
                <div style="background-color: #f4f4f5; padding: 14px; border-radius: 10px; font-size: 13px; color: #18181b; margin: 16px 0;">
                  <p style="margin: 4px 0;"><strong>Time:</strong> ${timestamp}</p>
                  <p style="margin: 4px 0;"><strong>Detail:</strong> ${reason}</p>
                  <p style="margin: 4px 0;"><strong>Device:</strong> ${userAgent}</p>
                </div>
                <p style="color: #71717a; font-size: 12px; margin-bottom: 0;">
                  If this was an authorized staff member, they can try again using the new master password <strong>1018</strong> or their personal PIN.
                </p>
              </div>
            `
          },
          createdAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.warn('Error recording security alert to Firestore:', err);
    }

    // 3. Send email to Didula via FormSubmit email relay
    try {
      await fetch('https://formsubmit.co/ajax/didula@saloonaquiness.lk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          _subject: emailSubject,
          alert: isMultipleFail 
            ? '🚨 WARNING: Someone failed staff PIN entry more than 3 times!' 
            : 'Staff portal sign-in activity recorded.',
          timestamp: timestamp,
          device: userAgent,
          trigger: reason
        })
      });
    } catch (err) {
      console.warn('Error sending alert email notification:', err);
    }
  }
};
