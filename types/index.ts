// Tipos compartilhados entre Web App e Redirector

export interface TrackingData {
  testId: number;
  variationId: number;
  clickId: string;
}

export interface CampaignData {
  id: number;
  slug: string;
  userId: number;
  status: 'active' | 'paused' | 'completed' | 'archived';
  variations: VariationData[];
}

export interface VariationData {
  id: number;
  name: string;
  destinationUrl: string;
  checkoutUrl: string | null;
  percentage: number;
  active: boolean;
  isControl: boolean;
}

export interface EventData {
  eventType: 'view' | 'engagement' | 'conversion' | 'purchase' | 'refund' | 'chargeback';
  eventName?: string;
  clickId: string;
  campaignId: number;
  variationId: number;
  eventValue?: number;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  country?: string;
  region?: string;
  city?: string;
  referrer?: string;
  landingPage?: string;
  metadata?: Record<string, any>;
}

export interface WebhookPlatform {
  id: string;
  name: string;
  logo: string;
  color: string;
  events: Array<{ value: string; label: string }>;
  fieldMapping: Record<string, string>;
  signatureValidation?: {
    header: string;
    algorithm: string;
    secretKey: string;
  };
  docs: string;
}

export interface AnalyticsMetrics {
  totalViews: number;
  totalCheckouts: number;
  totalPurchases: number;
  totalRevenue: number;
  checkoutRate: number;
  purchaseRate: number;
  avgOrderValue: number;
  revenuePerView: number;
}

export interface FunnelStep {
  step: string;
  count: number;
  percentage: number;
  dropoff: number;
  dropoffRate: number;
}

// Utilitários
export function parseTrackingCode(utmTerm: string): TrackingData | null {
  const match = utmTerm.match(/^(\d+)-(\d+)-([a-z0-9]+)$/);
  if (!match) return null;
  
  return {
    testId: parseInt(match[1]),
    variationId: parseInt(match[2]),
    clickId: match[3]
  };
}

export function generateTrackingCode(testId: number, variationId: number, clickId: string): string {
  return `${testId}-${variationId}-${clickId}`;
}

export function generateClickId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}
