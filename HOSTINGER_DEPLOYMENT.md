# 🚀 HackB4 Production Deployment Guide for Hostinger ($0 Extra Cost)

This production deployment guide details how to host **HackB4** on an existing **Hostinger VPS or Node.js hosting plan** with **$0 monthly infrastructure overhead**, zero paid SaaS subscriptions, automated payments, and real-time smartphone gate verification.

---

## 💎 Zero-Cost Architecture Overview

| Component | Technology | Cost | How It Works |
| :--- | :--- | :--- | :--- |
| **Frontend & API** | Next.js 16 (Standalone Node.js Server) | **$0** | Runs directly on client's existing Hostinger server via PM2. No Docker, no Kubernetes. |
| **Database & Realtime** | Convex Cloud (Free Tier) | **$0** | 1,000,000 reads & 250,000 writes/month included. Realtime WebSocket sync for live ticket counters & gate check-ins. |
| **Payment Gateway** | Razorpay (Standard Account) | **$0/mo** | Zero setup or recurring fees. Standard ~2% transaction fee deducted per sale. Money deposited directly to client's bank account. |
| **Digital Passes & QR** | Client-Side Vector SVG (`react-qr-code`) | **$0** | Rendered entirely inside the buyer's browser. Zero server CPU image rendering overhead. |
| **Gate Verification** | Native HTML5 Smartphone Camera (`/admin/checkin`) | **$0** | Organizers open URL on iPhone / Android. Real-time duplicate rejection with audio chimes. |
| **SSL Certificate** | Let's Encrypt Certbot | **$0** | Free automated 1-click HTTPS certificate. |

---

## 📋 Step 1: Client Prerequisites & Credentials

During your meeting with the client, gather or set up these 4 items:

1. **Subdomain on Hostinger**:
   - Point a subdomain (e.g. `tickets.clientwebsite.com` or `events.clientwebsite.com`) to the Hostinger server IP address (DNS A Record).
2. **Razorpay Account (Client's Own Account)**:
   - Login to [Razorpay Dashboard](https://dashboard.razorpay.com).
   - Go to **Account & Settings > API Keys > Generate Key**.
   - Copy `Key Id` (`rzp_live_...` or `rzp_test_...`) and `Key Secret`.
3. **Razorpay Webhook**:
   - Go to **Account & Settings > Webhooks > Add New Webhook**.
   - **Webhook URL**: `https://tickets.clientwebsite.com/api/webhooks/razorpay`
   - **Secret**: Any secure random password (e.g. `webhook_secret_123`).
   - **Active Events**: Check `payment.captured` and `order.paid`.
4. **Convex Cloud Deployment**:
   - Run `npx convex deploy` once on your machine or on the server.
   - It will output your production deployment URL (e.g. `https://xxx.convex.cloud`).

---

## 🛠️ Step 2: Server Setup on Hostinger (Step-by-Step)

SSH into the Hostinger VPS:
```bash
ssh root@your-hostinger-server-ip
```

### 1. Install Node.js 20+ & PM2 (if not already installed)
```bash
# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 process manager globally (free)
sudo npm install -g pm2
```

### 2. Clone Repository & Install Dependencies
```bash
cd /var/www
git clone <your-git-repository-url> hackb4
cd hackb4

npm install
```

### 3. Configure Production Environment Variables
Create `.env.local`:
```bash
nano .env.local
```
Paste in the client's production keys:
```env
NEXT_PUBLIC_APP_URL=https://tickets.clientwebsite.com
NEXT_PUBLIC_CONVEX_URL=https://your-convex-deployment.convex.cloud

PAYMENT_MODE=razorpay
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here

TICKET_SECRET=production_random_secret_string_32chars
AUTH_SECRET=production_random_admin_secret_32chars
```
Press `Ctrl+O`, `Enter`, and `Ctrl+X` to save.

### 4. Build Standalone Production Bundle
```bash
npm run build
```
*(Because `output: 'standalone'` is enabled, Next.js generates an ultra-lightweight standalone server in `.next/standalone` that uses only ~80MB–120MB of server RAM).*

### 5. Start with PM2 (Auto-Restart & Zero Downtime)
```bash
# Copy static assets to standalone folder (required by Next.js standalone)
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/

# Start with PM2
cd .next/standalone
pm2 start server.js --name "hackb4-tickets"
pm2 save
pm2 startup
```

---

## 🌐 Step 3: Nginx Reverse Proxy & Free SSL

### 1. Configure Nginx
Create an Nginx configuration file:
```bash
sudo nano /etc/nginx/sites-available/tickets.clientwebsite.com
```
Add the following configuration:
```nginx
server {
    listen 80;
    server_name tickets.clientwebsite.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site and reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/tickets.clientwebsite.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 2. Enable Free Let's Encrypt SSL
```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d tickets.clientwebsite.com
```
Select automatic redirect to HTTPS.

---

## 📱 Step 4: Live Event Gate Verification (For Volunteers & Staff)

On event day, gate volunteers and organizers do not need any hardware or barcode scanners:

1. Open `https://tickets.clientwebsite.com/admin/checkin` on any smartphone (iOS Safari, Android Chrome).
2. Tap **"Start Phone Camera"** and allow camera permission.
3. Point the phone at attendee QR passes:
   - **Valid Ticket**: Screen turns bright green, displays attendee name & ticket tier, and plays a positive chime sound.
   - **Duplicate Ticket (Fraud / Re-entry)**: Screen flashes red, vibrates, plays warning buzz, and displays: `ENTRY DENIED: DUPLICATE ENTRY DETECTED (Scanned at 09:14:22 by Gate 1)`.
4. The scanner automatically resets and readies for the next person in line within 1.8 seconds.

---

## ✅ Step 5: Pre-Flight Verification Checklist Before Client Meeting

- [ ] All routes load with HTTP 200 (`/`, `/events`, `/dashboard`, `/admin`, `/admin/checkin`).
- [ ] `npm run build` succeeds cleanly with `output: 'standalone'`.
- [ ] Test purchase works with `PAYMENT_MODE=mock` without spending money.
- [ ] Real-time gate scanner detects and checks in tickets from phone camera.
- [ ] Duplicate scan rejection fires red alert when scanning the same ticket twice.
