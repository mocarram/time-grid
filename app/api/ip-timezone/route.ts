import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get the client's IP address
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const clientIp = forwarded?.split(',')[0] || realIp || request.ip || '127.0.0.1';
    
    // For development/localhost, use a fallback IP (New York)
    const ipToCheck = clientIp === '127.0.0.1' || clientIp === '::1' || clientIp?.includes('localhost') 
      ? '8.8.8.8' // Google DNS as fallback
      : clientIp;

    // Use ipapi.co for IP geolocation (free tier available)
    const response = await fetch(`https://ipapi.co/${ipToCheck}/json/`, {
      headers: {
        'User-Agent': 'TimeGrid/1.0',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch IP location data');
    }

    const data = await response.json();
    
    // Fallback to browser timezone if IP detection fails
    if (data.error || !data.timezone) {
      return NextResponse.json({
        city: 'Local',
        country: 'Unknown',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        source: 'browser'
      });
    }

    return NextResponse.json({
      city: data.city || 'Unknown City',
      country: data.country_name || 'Unknown Country',
      timezone: data.timezone,
      source: 'ip',
      ip: ipToCheck
    });
  } catch (error) {
    console.error('IP timezone detection error:', error);
    
    // Fallback to browser timezone
    return NextResponse.json({
      city: 'Local',
      country: 'Unknown',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      source: 'browser'
    });
  }
}