import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  if (!lat || !lng) {
    return NextResponse.json({ error: 'Missing coordinates' }, { status: 400 });
  }

  try {
    // Using TimeZoneDB API (free tier available) or GeoNames
    // For now, we'll use a simpler approach with multiple fallbacks
    
    // First try: BigDataCloud (free, includes timezone)
    let timezone = null;
    let city = null;
    let country = null;

    try {
      const bdcResponse = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      );
      
      if (bdcResponse.ok) {
        const bdcData = await bdcResponse.json();
        timezone = bdcData.timezone;
        city = bdcData.city || bdcData.locality;
        country = bdcData.countryName;
      }
    } catch (e) {
      console.log('BigDataCloud failed, trying fallback');
    }

    // Fallback: Use coordinate-based timezone estimation
    if (!timezone) {
      timezone = estimateTimezoneFromCoordinates(parseFloat(lat), parseFloat(lng));
    }

    // Additional location info if not available
    if (!city || !country) {
      try {
        const nominatimResponse = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'WorldClock/1.0',
              'Accept-Language': 'en'
            }
          }
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
          {
            headers: {
              "Accept-Language": "en",
            },
          }
        );
        
        if (nominatimResponse.ok) {
          const nominatimData = await nominatimResponse.json();
          const address = nominatimData.address || {};
          
          if (!city) {
            city = address.city || address.town || address.village || 
                   address.municipality || 'Unknown City';
          }
          if (!country) {
            country = address.country || 'Unknown Country';
          }
        }
      } catch (e) {
        console.log('Nominatim fallback failed');
      }
    }

    // Calculate timezone offset
    const offset = getTimezoneOffsetFromName(timezone || 'UTC');

    return NextResponse.json({
      city: city || 'Unknown City',
      country: country || 'Unknown Country',
      timezone: timezone || 'UTC',
      offset
    });
  } catch (error) {
    console.error('Timezone API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch timezone data' },
      { status: 500 }
    );
  }
}

function estimateTimezoneFromCoordinates(lat: number, lng: number): string {
  // Simple timezone estimation based on longitude
  // This is a rough approximation - in production you'd want a proper timezone API
  const timezoneOffset = Math.round(lng / 15);
  
  // Map common timezone offsets to actual timezone names
  const timezoneMap: { [key: number]: string } = {
    '-12': 'Pacific/Baker_Island',
    '-11': 'Pacific/Samoa',
    '-10': 'Pacific/Honolulu',
    '-9': 'America/Anchorage',
    '-8': 'America/Los_Angeles',
    '-7': 'America/Denver',
    '-6': 'America/Chicago',
    '-5': 'America/New_York',
    '-4': 'America/Halifax',
    '-3': 'America/Sao_Paulo',
    '-2': 'Atlantic/South_Georgia',
    '-1': 'Atlantic/Azores',
    '0': 'Europe/London',
    '1': 'Europe/Paris',
    '2': 'Europe/Berlin',
    '3': 'Europe/Moscow',
    '4': 'Asia/Dubai',
    '5': 'Asia/Karachi',
    '6': 'Asia/Dhaka',
    '7': 'Asia/Bangkok',
    '8': 'Asia/Shanghai',
    '9': 'Asia/Tokyo',
    '10': 'Australia/Sydney',
    '11': 'Pacific/Norfolk',
    '12': 'Pacific/Auckland'
  };

  return timezoneMap[timezoneOffset] || 'UTC';
}

function getTimezoneOffsetFromName(timezone: string): number {
  try {
    const now = new Date();
    const targetTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const utcTime = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const offsetMs = targetTime.getTime() - utcTime.getTime();
    return Math.round(offsetMs / 60000);
  } catch {
    return 0;
  }
}