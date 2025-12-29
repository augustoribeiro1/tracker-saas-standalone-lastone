import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { EventData } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const data: EventData = await request.json();
    
    const userAgent = request.headers.get('user-agent') || undefined;

    await db.event.create({
      data: {
        clickId: data.clickId,
        campaignId: data.campaignId,
        variationId: data.variationId,
        eventType: data.eventType,
        eventName: data.eventName,
        eventValue: data.eventValue,
        ipAddress: data.ipAddress,
        userAgent: userAgent,
        referer: data.referrer,
        utmSource: data.utmSource,
        utmMedium: data.utmMedium,
        utmCampaign: data.utmCampaign,
        utmTerm: data.utmTerm,
        utmContent: data.utmContent,
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Event tracking error:', error);
    return NextResponse.json(
      { error: 'Failed to track event' },
      { status: 500 }
    );
  }
}
