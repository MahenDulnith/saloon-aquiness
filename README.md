# Saloon Aquiness & Spa — Progressive Web App (PWA)

A luxury salon booking and staff management Progressive Web App built for **Saloon Aquiness**, implementing the architecture defined in `Salon Booking App Architecture Strategy.pdf`.

---

## 🌟 Key Features

### 1. Customer Booking Experience
- **Service Catalog**: Browse by categories (*Hair, Beard & Shave, Facials & Skin, Spa & Treatments, VIP Packages*) with real-time pricing and estimated durations.
- **Specialist Selection**: Choose specific stylists (*Didula, Kaveen, Malith, Nuwan*) or select *"First Available Master"* for quickest scheduling.
- **Dynamic Scheduling**: Next 14 days calendar picker with categorized morning, afternoon, and evening time slots. Double-booking prevention built-in.
- **Digital VIP Reservation Pass**: Instant digital voucher with reference code, QR code simulation, and celebration confetti.

### 2. Staff & Admin Management Portal
- **Dashboard Metrics**: Live view of pending booking requests, today's appointments, on-duty stylists, and projected revenue.
- **Appointment Lifecycle**: One-click actions to transition appointments: `Pending` → `Confirmed` → `In Chair (In Progress)` → `Completed` or `Cancelled`.
- **Direct Client Calling**: Direct `tel:` link to call client from mobile or desktop.
- **Service Catalog Manager**: Add custom services, adjust pricing and durations.
- **Staff Roster Management**: Toggle stylists between On-Duty and Off-Duty.
- **Instant Local Sync**: Reactive local storage with multi-tab updates and offline persistence.

### 3. PWA & Mobile Installation
- **No App Store Fees**: Avoids $99/year Apple Developer fees and App Store approval delays.
- **"Add to Home Screen"**: Works seamlessly on iPhone (Safari) and Android (Chrome) as a standalone app.
- **Service Worker & Manifest**: Preconfigured `manifest.json` and `sw.js` for offline viewing.

### 4. Firebase Architecture (Free Spark Tier)
- Ready-to-connect Firebase template in `src/firebase/config.ts`.
- Structured collections: `appointments`, `services`, `staff`, and `users`.

---

## 🚀 Running the App Locally

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.
