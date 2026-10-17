export type ServiceCategory = 'Hair' | 'Beard & Shave' | 'Facials & Skin' | 'Spa & Treatments' | 'VIP Packages';

export type AppointmentStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

export interface SalonService {
  id: string;
  name: string;
  category: ServiceCategory;
  price: number; // e.g. in LKR or preferred currency
  durationMinutes: number;
  description: string;
  popular?: boolean;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  specialty: string;
  rating: number;
  reviewsCount: number;
  avatar: string;
  email?: string;
  available: boolean;
  workingDays: number[]; // 0 for Sun, 1 for Mon, etc.
}

export interface CustomerProfile {
  id: string;
  name: string;
  phone: string;
  email?: string;
  loyaltyPoints?: number;
}

export interface Appointment {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  serviceDuration: number;
  staffId: string; // 'any' or specific staff id
  staffName: string;
  date: string; // YYYY-MM-DD
  timeSlot: string; // e.g. "10:30 AM"
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
}

export interface BookingState {
  selectedService: SalonService | null;
  selectedStaff: StaffMember | null;
  selectedDate: string;
  selectedTimeSlot: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  notes: string;
}

export type StaffUserRole = 'admin' | 'staff';

export interface CurrentStaffUser {
  id: string;
  name: string;
  role: StaffUserRole;
  title: string;
  avatar?: string;
  email?: string;
}
