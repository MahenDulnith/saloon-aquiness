import { 
  collection, 
  getDocs, 
  getDoc,
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
import { INITIAL_SERVICES, INITIAL_STAFF } from "../data/mockData";
import { StorageService } from "./storage";

const COLLECTIONS = {
  SERVICES: "services",
  STAFF: "staff",
  APPOINTMENTS: "appointments",
  AUDIT: "auditLog",
};

// Resolves 'saved' once the server confirms the write. With no signal the write stays
// queued durably on the device, so after a few seconds we report 'queued' instead of hanging.
// Real rejections (e.g. permission denied) still throw.
const withSyncTimeout = (p: Promise<unknown>, ms = 6000): Promise<'saved' | 'queued'> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve('queued'), ms);
    p.then(
      () => { clearTimeout(timer); resolve('saved'); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });

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
      } else {
        // Sanitize existing staff documents: remove any legacy unsplash stock photos
        for (const d of staffSnap.docs) {
          const st = d.data() as StaffMember;
          if (st.avatar && st.avatar.includes('unsplash.com')) {
            try {
              await updateDoc(doc(db, COLLECTIONS.STAFF, d.id), { avatar: '' });
            } catch (_) {}
          }
        }
      }

      // Clean up any legacy demo/mock appointments from Cloud Firestore
      const demoMockAptIds = ['apt-101', 'apt-102', 'apt-103'];
      for (const demoId of demoMockAptIds) {
        try {
          await deleteDoc(doc(db, COLLECTIONS.APPOINTMENTS, demoId));
        } catch (_) {}
      }

      // Clean up any legacy demo/mock staff from Cloud Firestore
      const demoMockStaffIds = ['staff-2', 'staff-3', 'staff-4'];
      for (const demoStaffId of demoMockStaffIds) {
        try {
          const docRef = doc(db, COLLECTIONS.STAFF, demoStaffId);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            if (data?.name?.includes('Kaveen') || data?.name?.includes('Malith') || data?.name?.includes('Nuwan')) {
              await deleteDoc(docRef);
            }
          }
        } catch (_) {}
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
      const staffList = snap.docs
        .map(d => {
          const st = d.data() as StaffMember;
          return {
            ...st,
            avatar: st.avatar && !st.avatar.includes('unsplash.com') ? st.avatar : ''
          };
        })
        .filter(st => {
          const isLegacyMock = ['staff-2', 'staff-3', 'staff-4'].includes(st.id) &&
            (st.name.includes('Kaveen') || st.name.includes('Malith') || st.name.includes('Nuwan'));
          return !isLegacyMock;
        });

      const finalList = staffList.length > 0 ? staffList : INITIAL_STAFF;
      StorageService.setStaff(finalList);
      return finalList;
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
      const list = snap.docs
        .map(d => d.data() as Appointment)
        .filter(a => !['apt-101', 'apt-102', 'apt-103'].includes(a.id) && !a.deleted);
      return list;
    } catch (e) {
      console.warn("Error reading appointments from Firestore, using local cache:", e);
      return StorageService.getAppointments();
    }
  },

  // Permanent history of every money-related change (who / what / when)
  logAudit(entry: {
    action: string;
    appointmentId: string;
    actor?: string;
    before?: unknown;
    after?: unknown;
  }): void {
    if (!isFirebaseConfigured()) return;
    try {
      addDoc(collection(db, COLLECTIONS.AUDIT), sanitizeForFirestore({
        ...entry,
        actor: entry.actor || 'unknown',
        at: new Date().toISOString(),
        serverAt: serverTimestamp()
      })).catch(e => console.warn("Audit log write queued/failed:", e));
    } catch (e) {
      console.warn("Audit log error:", e);
    }
  },

  async createAppointment(aptData: Omit<Appointment, 'id' | 'createdAt' | 'status'> & { status?: AppointmentStatus }, actor?: string): Promise<Appointment> {
    const localApt = StorageService.createAppointment(aptData);
    if (!isFirebaseConfigured()) return localApt;

    const record = localApt.status === 'completed'
      ? { ...localApt, completedAt: new Date().toISOString(), completedBy: actor || 'unknown' }
      : localApt;

    try {
      const result = await withSyncTimeout(
        setDoc(doc(db, COLLECTIONS.APPOINTMENTS, localApt.id), sanitizeForFirestore({
          ...record,
          firestoreTimestamp: serverTimestamp()
        }))
      );
      // 'queued' = no signal right now; the device keeps it and uploads automatically.
      if (result === 'queued') console.warn("Appointment saved on device, waiting to sync.");
    } catch (e) {
      // The cloud refused the record: do NOT pretend it was saved.
      StorageService.deleteAppointment(localApt.id);
      console.error("Firestore error saving appointment:", e);
      throw new Error("Could not save the record. Please check your connection and try again.");
    }
    this.logAudit({ action: 'create', appointmentId: localApt.id, actor, after: record });
    return record;
  },

  async updateAppointmentStatus(
    id: string,
    newStatus: AppointmentStatus,
    actor?: { id?: string; name?: string }
  ): Promise<void> {
    const before = StorageService.getAppointments().find(a => a.id === id);
    const patch: Partial<Appointment> = { status: newStatus };

    if (newStatus === 'completed') {
      patch.completedAt = new Date().toISOString();
      patch.completedBy = actor?.name || 'unknown';
      // A job booked as "Any" belongs to whoever actually completed it, so it is paid correctly
      if (before && before.staffId === 'any' && actor?.id) {
        patch.staffId = actor.id;
        patch.staffName = actor.name || before.staffName;
      }
    }

    StorageService.patchAppointment(id, patch);
    if (!isFirebaseConfigured()) return;

    try {
      await withSyncTimeout(updateDoc(doc(db, COLLECTIONS.APPOINTMENTS, id), sanitizeForFirestore(patch)));
    } catch (e) {
      console.error("Firestore error updating appointment status:", e);
      if (before) StorageService.patchAppointment(id, { status: before.status, staffId: before.staffId, staffName: before.staffName });
      throw new Error("Could not update the job. Please check your connection and try again.");
    }
    this.logAudit({
      action: `status:${before?.status ?? '?'}->${newStatus}`,
      appointmentId: id,
      actor: actor?.name,
      before: before ? { status: before.status, staffId: before.staffId, price: before.servicePrice } : undefined,
      after: patch
    });
  },

  // Records are never erased: "delete" hides the job but keeps it (and its audit trail) forever.
  async deleteAppointment(id: string, actor?: string): Promise<void> {
    const before = StorageService.getAppointments().find(a => a.id === id);
    const patch = { deleted: true, deletedAt: new Date().toISOString(), deletedBy: actor || 'unknown' };

    StorageService.deleteAppointment(id);
    if (!isFirebaseConfigured()) return;

    try {
      await withSyncTimeout(updateDoc(doc(db, COLLECTIONS.APPOINTMENTS, id), sanitizeForFirestore(patch)));
    } catch (e) {
      console.error("Firestore error deleting appointment:", e);
      if (before) StorageService.setAppointments([before, ...StorageService.getAppointments()]);
      throw new Error("Could not remove the job. Please check your connection and try again.");
    }
    this.logAudit({ action: 'delete', appointmentId: id, actor, before });
  },

  // Real-time listener for live sync
  subscribeToAppointments(onUpdate: (appointments: Appointment[]) => void): () => void {
    if (!isFirebaseConfigured()) {
      return () => {};
    }

    try {
      const q = query(collection(db, COLLECTIONS.APPOINTMENTS), orderBy("createdAt", "desc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list = snapshot.docs
          .map(d => d.data() as Appointment)
          .filter(a => !['apt-101', 'apt-102', 'apt-103'].includes(a.id) && !a.deleted);
        onUpdate(list);
      }, (err) => {
        console.warn("Real-time listener note (offline or permission):", err);
      });
      return unsubscribe;
    } catch (e) {
      console.warn("Failed to subscribe to appointments:", e);
      return () => {};
    }
  },

  // Real-time listener for live staff sync across all devices
  subscribeToStaff(onUpdate: (staff: StaffMember[]) => void): () => void {
    if (!isFirebaseConfigured()) {
      return () => {};
    }

    try {
      const q = collection(db, COLLECTIONS.STAFF);
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list = snapshot.docs
          .map(d => {
            const st = d.data() as StaffMember;
            return {
              ...st,
              avatar: st.avatar && !st.avatar.includes('unsplash.com') ? st.avatar : ''
            };
          })
          .filter(st => {
            const isLegacyMock = ['staff-2', 'staff-3', 'staff-4'].includes(st.id) &&
              (st.name.includes('Kaveen') || st.name.includes('Malith') || st.name.includes('Nuwan'));
            return !isLegacyMock;
          });
        const finalList = list.length > 0 ? list : INITIAL_STAFF;
        StorageService.setStaff(finalList);
        onUpdate(finalList);
      }, (err) => {
        console.warn("Real-time staff listener note (offline or permission):", err);
      });
      return unsubscribe;
    } catch (e) {
      console.warn("Failed to subscribe to staff:", e);
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
