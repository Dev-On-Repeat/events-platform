import { z } from 'zod';

// Event validation
export const eventSchema = z.object({
  name: z.string().min(3, 'Event name must be at least 3 characters').max(100),
  slug: z.string().min(3).max(100).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  shortDescription: z.string().max(200).optional(),
  category: z.string().min(1, 'Category is required'),
  imageUrl: z.string().url().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  registrationDeadline: z.coerce.date(),
  venue: z.string().min(1, 'Venue is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().optional(),
  totalSeats: z.number().int().min(1, 'Total seats must be at least 1'),
  availableSeats: z.number().int().min(0),
  basePrice: z.number().int().min(0, 'Base price must be non-negative'),
  platformFee: z.number().int().min(0).default(0),
  taxRate: z.number().min(0).max(1).default(0.18),
  participationType: z.enum(['SOLO', 'TEAM', 'BOTH']),
  minTeamSize: z.number().int().min(1).optional(),
  maxTeamSize: z.number().int().min(1).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'SOLD_OUT', 'COMPLETED', 'CANCELLED']).default('DRAFT'),
  rules: z.string().optional(),
  eligibility: z.string().optional(),
  schedule: z.string().optional(),
  prizes: z.string().optional(),
  faqs: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
}).refine((data) => {
  if (data.endDate <= data.startDate) {
    return false;
  }
  if (data.registrationDeadline >= data.startDate) {
    return false;
  }
  if (data.participationType === 'TEAM' || data.participationType === 'BOTH') {
    if (!data.minTeamSize || !data.maxTeamSize) {
      return false;
    }
    if (data.minTeamSize > data.maxTeamSize) {
      return false;
    }
  }
  return true;
}, {
  message: 'Invalid date or team size configuration',
});

// Registration validation
export const registrationSchema = z.object({
  eventId: z.string().cuid(),
  participantName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number'),
  dateOfBirth: z.coerce.date().optional(),
  gender: z.string().optional(),
  college: z.string().min(2, 'College name must be at least 2 characters'),
  course: z.string().optional(),
  yearOfStudy: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().optional(),
  participationType: z.enum(['SOLO', 'TEAM']),
  teamName: z.string().min(2, 'Team name must be at least 2 characters').optional(),
  teamSize: z.number().int().min(1).optional(),
  teamMembers: z.array(z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number'),
    college: z.string().min(2, 'College name must be at least 2 characters'),
    course: z.string().optional(),
    yearOfStudy: z.string().optional(),
    isTeamLeader: z.boolean().default(false),
  })).optional(),
}).refine((data) => {
  if (data.participationType === 'TEAM') {
    if (!data.teamName || !data.teamSize || !data.teamMembers) {
      return false;
    }
    if (data.teamMembers.length !== data.teamSize) {
      return false;
    }
    if (data.teamMembers.length < 1) {
      return false;
    }
  }
  return true;
}, {
  message: 'Invalid team registration data',
});

// Payment validation
export const paymentOrderSchema = z.object({
  registrationId: z.string().cuid(),
  currency: z.string().default('INR'),
});

export const paymentVerificationSchema = z.object({
  paymentId: z.string(),
  orderId: z.string(),
  signature: z.string().optional(),
});

// Admin validation
export const adminSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Custom field validation
export const customFieldSchema = z.object({
  name: z.string().min(1).max(50),
  label: z.string().min(1).max(100),
  type: z.enum(['TEXT', 'EMAIL', 'PHONE', 'NUMBER', 'SELECT', 'RADIO', 'CHECKBOX', 'TEXTAREA']),
  required: z.boolean().default(false),
  options: z.string().optional(),
  placeholder: z.string().optional(),
});
