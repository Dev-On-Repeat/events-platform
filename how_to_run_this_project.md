# How to Run This Project

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Git

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Convex Backend (Required)

The Convex backend must be running for the application to work. Open a new terminal:

```bash
npx convex dev
```

This will:
- Start the Convex local backend on `http://127.0.0.1:3210`
- Deploy all Convex functions
- Create/update `.env.local` with Convex URLs

**Keep this terminal open** - the Convex backend must remain running.

### 3. Seed Initial Events (First Time Only)

In another terminal (while Convex is running):

```bash
npx convex run events:seedInitialEvents
```

This will populate the database with 4 sample events for testing.

### 4. Start Next.js Development Server

In a new terminal:

```bash
npm run dev
```

This will start the Next.js application on `http://localhost:3000`

## Access the Application

- **Main Application**: http://localhost:3000
- **Events**: http://localhost:3000/events
- **Admin Portal**: http://localhost:3000/admin
- **Gate Scanner**: http://localhost:3000/admin/checkin
- **User Dashboard**: http://localhost:3000/dashboard

## Development Workflow

### Recommended Terminal Setup

Open 3 terminals:

**Terminal 1 - Convex Backend:**
```bash
npx convex dev
```

**Terminal 2 - Next.js Dev Server:**
```bash
npm run dev
```

**Terminal 3 - Convex Commands (as needed):**
```bash
# Seed events
npx convex run events:seedInitialEvents

# List events
npx convex run events:list

# Check metrics
npx convex run registrations:getMetrics
```

## Environment Variables

The project uses the following environment variables (configured in `.env`):

```env
# Application URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Convex Backend (auto-configured by npx convex dev)
CONVEX_DEPLOYMENT=dev:local
NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3210
NEXT_PUBLIC_CONVEX_SITE_URL=http://127.0.0.1:3210

# Payment Mode
PAYMENT_MODE=mock  # Use 'razorpay' for live payments

# Razorpay Credentials (when PAYMENT_MODE=razorpay)
# RAZORPAY_KEY_ID=your_key_id
# RAZORPAY_KEY_SECRET=your_key_secret
# RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# Security Secrets
TICKET_SECRET=hackb4-secure-ticket-secret-change-in-production
AUTH_SECRET=hackb4-auth-secret-change-in-production
```

## Stopping the Application

To stop the application:

1. Press `Ctrl+C` in the Next.js terminal
2. Press `Ctrl+C` in the Convex terminal
3. Wait for both processes to fully stop

## Common Issues

### Port Already in Use

If you see "Port 3000 is in use":

```bash
# Windows
taskkill /PID <PID> /F

# Mac/Linux
kill -9 <PID>
```

### Convex Backend Not Responding

If events don't load:

1. Ensure Convex dev server is running
2. Check that `.env.local` has correct Convex URLs
3. Restart the Next.js dev server

### Events Not Showing

If events don't appear:

1. Verify Convex backend is running
2. Run seed command: `npx convex run events:seedInitialEvents`
3. Check browser console for errors

## Testing the Complete Flow

1. **Browse Events**: Visit http://localhost:3000/events
2. **View Event Details**: Click on any event
3. **Register**: Fill registration form (solo or team)
4. **Checkout**: Complete mock payment
5. **View Ticket**: Access your ticket with QR code
6. **Check Dashboard**: Visit http://localhost:3000/dashboard
7. **Admin**: Visit http://localhost:3000/admin to manage events
8. **Check-in**: Visit http://localhost:3000/admin/checkin to scan tickets

## Production Deployment

For production deployment, see `PRODUCTION_GUIDE.md` for detailed instructions on deploying to:
- Vercel (Next.js)
- Convex Cloud (Backend)
- Razorpay (Live payments)

## Additional Commands

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Build for production
npm run build

# Start production server
npm start
```

## Architecture Overview

- **Frontend**: Next.js 16.3.5 with App Router
- **Backend**: Convex (serverless functions + database)
- **Payment**: Razorpay (with mock mode for development)
- **Authentication**: Guest sessions (localStorage)
- **Real-time**: Convex subscriptions for live updates

## Support

For issues or questions, refer to:
- `PRODUCTION_GUIDE.md` - Production deployment
- `PRODUCTION_IMPROVEMENTS_REPORT.md` - Enhancement roadmap
- `OPTIMIZATION_SUMMARY.md` - Performance optimizations
