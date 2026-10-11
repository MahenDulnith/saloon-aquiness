import { SalonService, StaffMember, Appointment } from '../types';

export const INITIAL_SERVICES: SalonService[] = [
  {
    id: 'srv-1',
    name: 'Executive Precision Haircut & Styling',
    category: 'Hair',
    price: 2500,
    durationMinutes: 45,
    description: 'Bespoke consultation, precision scissor cut, invigorating hair wash, and artisan matte styling.',
    popular: true
  },
  {
    id: 'srv-2',
    name: 'Fade Craft & Razor Edge Finish',
    category: 'Hair',
    price: 2200,
    durationMinutes: 40,
    description: 'Skin fade, taper or burst fade finished with straight-razor detailing and cooling aftershave spray.',
    popular: true
  },
  {
    id: 'srv-3',
    name: 'Royal Beard Sculpt & Hot Towel Treatment',
    category: 'Beard & Shave',
    price: 1800,
    durationMinutes: 35,
    description: 'Beard contouring, aromatic hot towel compress, organic beard oil hydration, and razor contour.',
    popular: true
  },
  {
    id: 'srv-4',
    name: 'Traditional Straight Razor Clean Shave',
    category: 'Beard & Shave',
    price: 1500,
    durationMinutes: 30,
    description: 'Old-school rich lather shave with multiple warm towels, cold stone pore closing, and balm application.'
  },
  {
    id: 'srv-5',
    name: 'Deep Cleansing Gold & Charcoal Facial',
    category: 'Facials & Skin',
    price: 4500,
    durationMinutes: 60,
    description: 'Detoxifying steam, ultrasonic exfoliation, blackhead extraction, gold-leaf peptide rejuvenation mask.',
    popular: true
  },
  {
    id: 'srv-6',
    name: 'Express Glow Vitamin C Face Therapy',
    category: 'Facials & Skin',
    price: 3200,
    durationMinutes: 35,
    description: 'Instant revitalization for tired skin with gentle microdermabrasion and high-dose citrus serum.'
  },
  {
    id: 'srv-7',
    name: 'Ayurvedic Herbal Head & Shoulder Massage',
    category: 'Spa & Treatments',
    price: 3000,
    durationMinutes: 45,
    description: 'Warm natural herbal oils massaged into pressure points to relieve tension, boost blood flow, and condition scalp.',
    popular: true
  },
  {
    id: 'srv-8',
    name: 'Intensive Keratin & Smooth Protein Treatment',
    category: 'Spa & Treatments',
    price: 8500,
    durationMinutes: 90,
    description: 'Frizz-free restructuring treatment for silky, manageable hair lasting up to 12 weeks.'
  },
  {
    id: 'srv-9',
    name: 'The Gentleman Signature VIP Package',
    category: 'VIP Packages',
    price: 9500,
    durationMinutes: 120,
    description: 'Precision Haircut + Beard Sculpting + Detox Facial + 30-min Stress Relief Head Massage with complimentary espresso.',
    popular: true
  },
  {
    id: 'srv-10',
    name: 'Groom & Best Man Wedding Day Package',
    category: 'VIP Packages',
    price: 18000,
    durationMinutes: 150,
    description: 'Complete luxury wedding grooming package with styling, skin glow therapy, massage, and photo-ready finishing.'
  }
];

export const INITIAL_STAFF: StaffMember[] = [
  {
    id: 'staff-1',
    name: 'Didula Perera',
    role: 'Founder & Master Stylist',
    specialty: 'Signature Scissor Work & VIP Grooming',
    rating: 4.98,
    reviewsCount: 340,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    available: true,
    workingDays: [1, 2, 3, 4, 5, 6]
  },
  {
    id: 'staff-2',
    name: 'Kaveen Silva',
    role: 'Senior Barber & Fade Specialist',
    specialty: 'Skin Fades, Texture Crops & Beard Art',
    rating: 4.92,
    reviewsCount: 215,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    available: true,
    workingDays: [1, 2, 3, 4, 5, 6, 0]
  },
  {
    id: 'staff-3',
    name: 'Malith Fernando',
    role: 'Hair Colorist & Spa Therapist',
    specialty: 'Coloring, Keratin & Head Massages',
    rating: 4.89,
    reviewsCount: 168,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    available: true,
    workingDays: [2, 3, 4, 5, 6, 0]
  },
  {
    id: 'staff-4',
    name: 'Nuwan Jayawardena',
    role: 'Senior Skin & Aesthetic Specialist',
    specialty: 'Detox Facials, Peels & Grooming',
    rating: 4.95,
    reviewsCount: 195,
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=400&q=80',
    available: true,
    workingDays: [1, 2, 4, 5, 6]
  }
];

export const TIME_SLOTS = [
  '09:00 AM', '09:45 AM', '10:30 AM', '11:15 AM',
  '12:00 PM', '01:30 PM', '02:15 PM', '03:00 PM',
  '03:45 PM', '04:30 PM', '05:15 PM', '06:00 PM',
  '06:45 PM', '07:30 PM'
];

export const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: 'apt-101',
    customerName: 'Roshan Samarasekara',
    customerPhone: '077 123 4567',
    customerEmail: 'roshan.s@example.com',
    serviceId: 'srv-1',
    serviceName: 'Executive Precision Haircut & Styling',
    servicePrice: 2500,
    serviceDuration: 45,
    staffId: 'staff-1',
    staffName: 'Didula Perera',
    date: new Date().toISOString().split('T')[0],
    timeSlot: '10:30 AM',
    status: 'confirmed',
    notes: 'Likes classic side part with natural pomade.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'apt-102',
    customerName: 'Chathura Bandara',
    customerPhone: '071 987 6543',
    customerEmail: 'chathura@example.com',
    serviceId: 'srv-3',
    serviceName: 'Royal Beard Sculpt & Hot Towel Treatment',
    servicePrice: 1800,
    serviceDuration: 35,
    staffId: 'staff-2',
    staffName: 'Kaveen Silva',
    date: new Date().toISOString().split('T')[0],
    timeSlot: '11:15 AM',
    status: 'in_progress',
    notes: 'Hot towel extra warm please.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'apt-103',
    customerName: 'Dr. Anura Wickramasinghe',
    customerPhone: '076 555 1212',
    serviceId: 'srv-9',
    serviceName: 'The Gentleman Signature VIP Package',
    servicePrice: 9500,
    serviceDuration: 120,
    staffId: 'staff-1',
    staffName: 'Didula Perera',
    date: new Date().toISOString().split('T')[0],
    timeSlot: '02:15 PM',
    status: 'pending',
    notes: 'VIP customer. Prefers quiet session.',
    createdAt: new Date().toISOString()
  }
];
