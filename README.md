# HackB4 — Event Ticketing & Registration Platform

A production-oriented event ticketing and registration platform engineered by combining the aesthetic excellence of **Tickity** with the booking mechanics and modular architecture of **Ticketr**, upgraded with **atomic Optimistic Concurrency Control (OCC) inventory mutations in Convex** and a decoupled **Razorpay payment provider**.

### System Scale & Validation Status
- **DESIGNED FOR**: Burst registration traffic in the **3,000–5,000 concurrent attendee** range.
- **VALIDATED**: **5,000 concurrent user** business-logic, inventory invariant, and OCC transaction simulation (257 ms total duration, 100% success, 0 errors, 0 overselling, 0 duplicate tickets).
- **NOT YET VALIDATED**: 5,000 simultaneous real HTTP users on production infrastructure (automated HTTP load test harness provided in `scripts/test-http-load.ts` for staging).
- **INFRASTRUCTURE REQUIREMENT**: Zero external database servers (no PostgreSQL, Redis, Kafka, or Docker required; powered by Next.js 16 + Convex).

---

## 🌟 Key Architecture & Highlights

- **Atomic Inventory Guarantees**: Prevents the critical race condition present in both original repositories. Capacity checks, temporary reservations, and confirmed ticket commitments are executed as transactional mutations in Convex.
- **Server-Authoritative Queue & 10-Minute Offers**: Live animated queue position indicator (FIFO) with scheduled auto-expiry (`ctx.scheduler.runAfter`) and fail-safe 1-minute crons.
- **Payment Abstraction**: Decoupled `PaymentProvider` interface supporting:
  - `RazorpayProvider`: Production Indian gateway with server-side HMAC-SHA256 signature verification.
  - `MockPaymentProvider`: Zero-credential mock gateway for instant local development, demonstration, and automated test simulations.
- **Frictionless Guest Checkout**: Attendees register with contact and college information without forced Clerk or OAuth account creation.
- **Flexible Registration Modes**: Configurable `SOLO`, `TEAM`, and `BOTH` participation with dynamic team member fields and min/max team size validation.
- **Tamper-Proof QR Passes**: Encrypted verification token with gate check-in scanner protecting against double-entry scans.
- **Complete Admin Portal**: Event creation, live capacity tracking, status management, registration explorer with CSV export, and gate check-in terminal.

---

## 🏗️ Route Hierarchy

### Public Attendee Flows
- `/events`: Discovery hub with search, category filters, and live availability cards.
- `/events/[eventId]`: Event details (eligibility, schedule, rules, prizes, FAQ accordion, dynamic CTA).
- `/register/[eventId]`: Guest registration form (Solo or Team with dynamic member fields).
- `/checkout/[registrationId]`: Live queue wait HUD or 10-minute reservation countdown timer with Razorpay/Mock checkout.
- `/ticket/[ticketId]`: Digital pass with high-resolution scannable QR code and print/PDF support.

### Organizer & Admin Portal
- `/admin`: Overview dashboard with revenue, tickets sold, and live capacity tracker.
- `/admin/events`: Event status controls (reopen, close, cancel).
- `/admin/events/new`: Event creation form with pricing and team limit rules.
- `/admin/registrations`: Registration explorer with search, status filters, and CSV export.
- `/admin/checkin`: Gate QR scanner terminal with double-scan fraud detection.

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm install --legacy-peer-deps
```

### 2. Environment Configuration
Copy the example environment configuration:
```bash
cp .env.example .env
```
Default `.env` configuration comes with `PAYMENT_MODE=mock`, allowing complete end-to-end event discovery, registration, queueing, checkout, and ticket generation without real money or gateway credentials.

### 3. Start Development Server
In one terminal, start the Next.js frontend:
```bash
npm run dev
```

In a second terminal, start Convex (local or cloud project):
```bash
npx convex dev
```

Open [http://localhost:3000/events](http://localhost:3000/events) to explore events. Click **"Seed Sample Production Events"** on the home page or admin dashboard to instantly populate sample events.

---

## 🧪 Concurrency & Failure Testing

Run the automated concurrency verification suite:
```bash
npx tsx scripts/test-concurrency.ts
```

### Test Results Summary:
1. **1,000 Concurrent User Surge against Capacity = 100**: Exactly 100 offered, 900 placed in FIFO waitlist. **Overselling = 0**.
2. **Payment Confirmation**: Exactly 100 tickets issued and committed to inventory.
3. **Idempotency Protection**: Duplicate submissions and duplicate payment callbacks return existing operations without duplicate tickets.
4. **Offer Expiration & FIFO Queue Advancement**: When reservations expire, the exact freed spots are immediately granted to next-in-line waiting attendees.
5. **Gate QR Check-in**: Double-scan prevention blocks re-entry attempts.
6. **HMAC Signature Verification**: Gateway cryptographic signature verification blocks forged payments.

---

## 🚢 Production Deployment

### 1. Deploy Convex Backend
```bash
npx convex deploy
```
Copy your production deployment URL (`NEXT_PUBLIC_CONVEX_URL`).

### 2. Configure Production Secrets
Set the following environment variables in your Vercel project:
- `NEXT_PUBLIC_CONVEX_URL`: Your Convex production deployment URL.
- `PAYMENT_MODE`: `razorpay`
- `RAZORPAY_KEY_ID`: Your Razorpay Key ID
- `RAZORPAY_KEY_SECRET`: Your Razorpay Key Secret
- `RAZORPAY_WEBHOOK_SECRET`: Your Razorpay Webhook Secret
- `TICKET_SECRET`: Strong 32-character random string for ticket verification tokens.
- `AUTH_SECRET`: Strong 32-character random string for administrator sessions.

### 3. Configure Razorpay Webhooks
In your Razorpay Dashboard (Settings → Webhooks):
- **URL**: `https://your-domain.com/api/webhooks/razorpay`
- **Secret**: Match `RAZORPAY_WEBHOOK_SECRET`
- **Active Events**: `payment.captured`, `order.paid`
