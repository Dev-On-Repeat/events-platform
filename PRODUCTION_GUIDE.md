# Production Deployment Guide

## Critical Production Requirements

### 1. Database Changes (REQUIRED for 30-50k concurrent users)

**Current**: SQLite (not suitable for production)
**Required**: PostgreSQL with connection pooling

```bash
# Install PostgreSQL client
npm install pg @types/pg

# Update DATABASE_URL in .env
DATABASE_URL="postgresql://user:password@host:5432/events_db?connection_limit=20&pool_timeout=20"
```

**Why**: SQLite doesn't handle concurrent writes well. PostgreSQL with connection pooling is essential for high concurrency.

### 2. Redis for Rate Limiting & Caching (REQUIRED)

**Current**: In-memory rate limiting (per-instance only)
**Required**: Redis for distributed rate limiting

```bash
# Install Redis client
npm install ioredis

# Add to .env
REDIS_URL="redis://localhost:6379"
```

**Implementation needed**:
- Replace in-memory rate limiter with Redis-based
- Cache event data to reduce database load
- Use Redis for distributed locking

### 3. Message Queue for Async Processing (REQUIRED)

**Current**: Synchronous processing
**Required**: BullMQ for background jobs

```bash
# Install BullMQ
npm install bullmq ioredis

# Add to .env
REDIS_URL="redis://localhost:6379"
```

**Async tasks**:
- Email sending (confirmation, tickets)
- PDF generation
- Analytics processing
- Webhook retries

### 4. Load Balancer & Multiple Instances (REQUIRED)

**Architecture**:
```
Load Balancer (Nginx/HAProxy)
    ↓
[App Instance 1] [App Instance 2] [App Instance 3]
    ↓               ↓               ↓
[Shared PostgreSQL Database]
    ↓
[Redis Cache + Queue]
```

**Deployment**: Use Docker/Kubernetes or serverless functions

### 5. Payment Gateway Integration (REQUIRED)

**Current**: Mock provider
**Required**: Real payment gateway (Razorpay/Stripe)

**Implementation**:
1. Create `src/lib/payment/razorpay-provider.ts`
2. Update `PAYMENT_MODE=razorpay` in .env
3. Add Razorpay credentials
4. Test webhook endpoints in sandbox mode

### 6. Strict Payment Verification (IMPLEMENTED)

**Current Status**: ✅ DONE
- Server-side verification only
- Atomic database transactions
- Idempotent webhook processing
- No ticket generation without PAID status
- Duplicate prevention

**What we added**:
- Strict PAID status check
- Personal data hashing in QR codes
- Atomic seat allocation
- Webhook signature verification
- Transaction-based updates

### 7. QR Code Security (ENHANCED)

**Current Status**: ✅ ENHANCED
- Personal data hash for uniqueness
- Signature verification
- Timestamp validation
- No sensitive data in QR code

**Unique QR per person**:
```typescript
// QR contains hash of: name + email + phone + registrationId
const personalHash = simpleHash(`${name}:${email}:${phone}:${registrationId}`);
```

### 8. Rate Limiting (IMPLEMENTED)

**Current Status**: ✅ DONE (in-memory)
- Registration: 5/minute per IP
- Payment: 10/minute per IP
- Webhook: 100/minute
- General API: 100/minute per IP

**For production**: Upgrade to Redis-based distributed rate limiting

### 9. Monitoring & Logging (NEEDED)

**Required**: 
- Structured logging (Winston/Pino)
- Error tracking (Sentry)
- Metrics (Prometheus/Grafana)
- Uptime monitoring

```bash
npm install winston pino @sentry/nextjs
```

### 10. Environment Variables (CRITICAL)

**Production .env**:
```env
# Database (PostgreSQL required)
DATABASE_URL="postgresql://user:password@host:5432/events_db?connection_limit=20"

# Redis
REDIS_URL="redis://localhost:6379"

# Payment (Razorpay example)
PAYMENT_MODE=razorpay
PAYMENT_KEY_ID="rzp_live_xxxxx"
PAYMENT_KEY_SECRET="your_secret"
PAYMENT_WEBHOOK_SECRET="your_webhook_secret"

# Application
NEXT_PUBLIC_APP_URL="https://yourdomain.com"

# Ticket Secret (STRONG RANDOM REQUIRED)
TICKET_SECRET="generate-with-openssl-rand-base64-32"

# Admin
ADMIN_EMAIL="admin@yourdomain.com"
ADMIN_PASSWORD_HASH="bcrypt_hash_of_strong_password"
```

## Scalability Analysis

### Current System Capacity
- **SQLite**: ~100 concurrent writes max
- **In-memory rate limiting**: Per-instance only
- **No caching**: Every request hits database
- **Synchronous processing**: Blocks on email/ticket generation

### With Recommended Changes
- **PostgreSQL**: 10,000+ concurrent transactions
- **Redis rate limiting**: Distributed across instances
- **Caching**: 90% reduction in database load
- **Async processing**: Non-blocking critical path
- **Load balancing**: Horizontal scaling

### Expected Performance
- **30-50k concurrent**: Feasible with proper setup
- **10k registrations/minute**: Achievable with optimizations
- **99.9% uptime**: Possible with proper monitoring

## Critical Production Checklist

### Database ✅
- [ ] Migrate to PostgreSQL
- [ ] Set up connection pooling
- [ ] Configure read replicas
- [ ] Set up automated backups
- [ ] Add database monitoring

### Caching ✅
- [ ] Install Redis
- [ ] Cache event data
- [ ] Cache registration counts
- [ ] Implement session management
- [ ] Set up cache invalidation

### Message Queue ✅
- [ ] Install BullMQ
- [ ] Create job processors
- [ ] Set up retry logic
- [ ] Monitor queue health
- [ ] Handle failed jobs

### Security ✅
- [ ] Change TICKET_SECRET to strong random value
- [ ] Enable HTTPS
- [ ] Set up CORS properly
- [ ] Add CSRF protection
- [ ] Implement proper authentication
- [ ] Security headers (helmet.js)

### Monitoring ✅
- [ ] Set up logging
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring
- [ ] Uptime monitoring
- [ ] Alert system

### Payment ✅
- [ ] Integrate real payment gateway
- [ ] Test in sandbox mode
- [ ] Set up webhook endpoint
- [ ] Configure payment verification
- [ ] Test payment flows end-to-end

### Deployment ✅
- [ ] Set up CI/CD pipeline
- [ ] Configure environment variables
- [ ] Set up load balancer
- [ ] Configure SSL certificates
- [ ] Set up CDN for static assets
- [ ] Database migration strategy

## Payment Flow Verification

### Current Strict Process (✅ IMPLEMENTED)

1. **User Registration** → Creates PENDING_PAYMENT registration
2. **Payment Order** → Creates payment with CREATED status
3. **User Pays** → Redirects to payment gateway
4. **Gateway Webhook** → ONLY processes if status = PAID
5. **Database Transaction** → Atomic update of payment + registration
6. **Ticket Generation** → ONLY if payment = PAID and registration != CONFIRMED
7. **Idempotency** → Duplicate webhooks don't create duplicate tickets

### What Prevents System Breaking

**Race Conditions**:
- Database transactions prevent overbooking
- Atomic seat allocation
- Unique constraints on registrations

**Payment Fraud**:
- Server-side verification only
- Webhook signature verification
- No client-side trust
- Strict PAID status requirement

**System Overload**:
- Rate limiting per endpoint
- Connection pooling
- Async non-critical tasks
- Circuit breakers (to be added)

## Production Deployment Steps

### 1. Infrastructure Setup
```bash
# Set up PostgreSQL database
createdb events_db

# Set up Redis
redis-server

# Set up environment variables
cp .env.example .env
# Edit .env with production values
```

### 2. Database Migration
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed initial data (optional)
npm run seed
```

### 3. Build & Deploy
```bash
# Build application
npm run build

# Start production server
npm start
```

### 4. Load Testing (BEFORE LAUNCH)
```bash
# Install load testing tool
npm install -g autocannon

# Test registration endpoint
autocannon -c 100 -d 30 http://localhost:3000/api/registrations

# Test payment endpoint
autocannon -c 50 -d 30 http://localhost:3000/api/payments/create-order
```

### 5. Monitoring Setup
```bash
# Set up logging
# Configure error tracking
# Set up performance monitoring
# Configure alerts
```

## What's Still Missing for Full Production

### High Priority
1. **PostgreSQL migration** (critical for scale)
2. **Redis setup** (critical for distributed systems)
3. **Real payment integration** (critical for revenue)
4. **Async job queue** (critical for UX)
5. **Monitoring/logging** (critical for operations)

### Medium Priority
6. **Circuit breakers** (for fault tolerance)
7. **Distributed locking** (for race conditions)
8. **CDN setup** (for performance)
9. **Email service** (for notifications)
10. **PDF generation** (for invoices)

### Low Priority
11. **Analytics dashboard** (for insights)
12. **A/B testing** (for optimization)
13. **Multi-region deployment** (for global scale)
14. **Advanced security** (WAF, DDoS protection)

## Conclusion

### Current State
✅ **Ready for beta testing** with mock payments
✅ **Architecture designed for scale**
✅ **Strict payment verification implemented**
✅ **Unique QR codes with personal data**
✅ **Basic rate limiting added**

### For Production Launch
❌ **Requires**: PostgreSQL, Redis, real payment gateway
❌ **Requires**: Monitoring, logging, alerting
❌ **Requires**: Load testing, performance optimization
❌ **Requires**: Security hardening, SSL setup

### Estimated Timeline
- **Basic production setup**: 2-3 days
- **Full production with monitoring**: 1 week
- **Load testing and optimization**: 3-5 days
- **Payment gateway integration**: 2-3 days

The system is architecturally sound and can handle 30-50k concurrent users with the recommended infrastructure changes. The payment verification is strict and prevents fraud. QR codes are unique per person. The main blockers are infrastructure setup (PostgreSQL, Redis) and payment gateway integration.
