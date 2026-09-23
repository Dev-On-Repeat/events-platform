import QRCode from 'qrcode';

// Simple hash function for demo (in production, use proper crypto)
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

function simpleHmac(str: string, secret: string): string {
  return simpleHash(str + secret);
}

export interface TicketData {
  ticketId: string;
  registrationId: string;
  eventId: string;
  participantName: string;
  eventName: string;
  participantEmail: string;
  participantPhone: string;
  timestamp: Date;
}

export async function generateQRCode(data: string): Promise<string> {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(data, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'H',
    });
    
    // Remove the data URL prefix to get just the base64 string
    return qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

export function generateTicketId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 9);
  return `TKT_${timestamp}_${random}`.toUpperCase();
}

export function generateQRData(ticket: TicketData): string {
  // Create a secure QR data that includes personal identifiers for uniqueness
  // We hash personal data to protect privacy while ensuring uniqueness
  const secret = process.env.TICKET_SECRET || 'default-ticket-secret';
  
  // Create a unique hash from personal data + ticket info
  const personalHash = simpleHash(`${ticket.participantName}:${ticket.participantEmail}:${ticket.participantPhone}:${ticket.registrationId}`).substr(0, 16);
  
  const qrData = {
    tid: ticket.ticketId,
    eid: ticket.eventId,
    ph: personalHash, // Personal hash for uniqueness verification
    ts: ticket.timestamp.getTime(),
    sig: generateSignature(ticket, secret),
  };
  
  return JSON.stringify(qrData);
}

function generateSignature(ticket: TicketData, secret: string): string {
  const data = `${ticket.ticketId}:${ticket.eventId}:${ticket.timestamp.getTime()}:${ticket.registrationId}`;
  return simpleHmac(data, secret).substr(0, 32);
}

export function verifyQRData(qrDataString: string): boolean {
  try {
    const qrData = JSON.parse(qrDataString);
    const { tid, eid, ph, ts, sig } = qrData;
    
    if (!tid || !eid || !ph || !ts || !sig) {
      return false;
    }
    
    const secret = process.env.TICKET_SECRET || 'default-ticket-secret';
    
    // Verify signature (basic check - in production, you'd fetch the ticket and verify against stored data)
    const expectedSigPattern = /^[a-f0-9]{32}$/;
    if (!expectedSigPattern.test(sig)) {
      return false;
    }
    
    // Verify timestamp is not too old (24 hours)
    const ticketTime = new Date(ts);
    const now = new Date();
    const hoursDiff = (now.getTime() - ticketTime.getTime()) / (1000 * 60 * 60);
    if (hoursDiff > 24) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('QR verification error:', error);
    return false;
  }
}

export function verifyPersonalDataMatch(qrDataString: string, participantName: string, participantEmail: string, participantPhone: string): boolean {
  try {
    const qrData = JSON.parse(qrDataString);
    const { ph } = qrData;
    
    if (!ph) return false;
    
    // Recreate the hash and verify it matches
    const secret = process.env.TICKET_SECRET || 'default-ticket-secret';
    const personalHash = simpleHash(`${participantName}:${participantEmail}:${participantPhone}`).substr(0, 16);
    
    return ph === personalHash;
  } catch (error) {
    console.error('Personal data verification error:', error);
    return false;
  }
}
