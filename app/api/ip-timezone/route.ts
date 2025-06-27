import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('=== IP Timezone Detection Debug ===');
    
    // Get the client's IP address
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const vercelIp = request.headers.get('x-vercel-forwarded-for');
    const clientIp = forwarded?.split(',')[0]?.trim() || 
                     vercelIp?.split(',')[0]?.trim() || 
                     realIp || 
                     request.ip || 
                     '127.0.0.1';
    
    console.log('Raw IP headers:', {
      forwarded,
      realIp,
      vercelIp,
      requestIp: request.ip,
      finalClientIp: clientIp
    });
    
    // For development/localhost or invalid IPs, use a fallback
    const isLocalhost = clientIp === '127.0.0.1' || 
                       clientIp === '::1' || 
                       clientIp?.includes('localhost') ||
                       !clientIp ||
                       clientIp === 'unknown';
                       
    const ipToCheck = isLocalhost
      ? null // Don't use IP detection for localhost
      : clientIp;

    let data = null;
    
    // Try IP detection only if we have a valid IP
    if (ipToCheck) {
      try {
        console.log('Attempting IP detection for:', ipToCheck);
        
        // Try multiple IP geolocation services
        const services = [
          {
            name: 'ipapi.co',
            url: `https://ipapi.co/${ipToCheck}/json/`,
            headers: { 'User-Agent': 'TimeGrid/1.0' } as HeadersInit
          },
          {
            name: 'ip-api.com',
            url: `http://ip-api.com/json/${ipToCheck}?fields=status,country,countryCode,region,regionName,city,timezone,query`,
            headers: {} as HeadersInit
          }
        ];
        
        for (const service of services) {
          try {
            console.log(`Trying ${service.name}...`);
            const response = await fetch(service.url, {
              headers: service.headers
            });
            
            if (response.ok) {
              const serviceData = await response.json();
              console.log(`${service.name} response:`, serviceData);
              
              if (service.name === 'ipapi.co' && serviceData.timezone && serviceData.error !== true) {
                data = {
                  city: serviceData.city || 'Unknown City',
                  country_name: serviceData.country_name || 'Unknown Country',
                  timezone: serviceData.timezone
                };
                break;
              } else if (service.name === 'ip-api.com' && serviceData.status === 'success' && serviceData.timezone) {
                data = {
                  city: serviceData.city || 'Unknown City',
                  country_name: serviceData.country || 'Unknown Country',
                  timezone: serviceData.timezone
                };
                break;
              }
            }
          } catch (serviceError) {
            console.log(`${service.name} failed:`, serviceError);
            continue;
          }
        }
      } catch (error) {
        console.error('All IP detection services failed:', error);
      }
    }
    
    // If IP detection failed or we're on localhost, use browser timezone
    if (!data || !data.timezone) {
      // Get browser timezone from request headers if available
      const browserTimezone = request.headers.get('x-timezone') || 
                             Intl.DateTimeFormat().resolvedOptions().timeZone;
      console.log('Using browser timezone fallback. Browser timezone:', browserTimezone);
      
      // Only use offset detection if we truly have no timezone info
      if (!browserTimezone || browserTimezone === 'UTC' || browserTimezone === '') {
        console.log('Browser timezone is UTC or invalid, trying alternative detection...');
        
        // Return UTC as last resort
        return NextResponse.json({
          city: 'UTC',
          country: 'UTC',
          timezone: 'UTC',
          source: 'browser'
        });
      }
      
      // Get proper city and country from timezone
      const city = browserTimezone.split('/').pop()?.replace(/_/g, ' ') || 'Local';
      
      // Map timezone to country
      const timezoneToCountry: { [key: string]: string } = {
        'Asia/Dhaka': 'Bangladesh',
        'Asia/Kolkata': 'India',
        'Asia/Shanghai': 'China',
        'Asia/Tokyo': 'Japan',
        'Asia/Seoul': 'South Korea',
        'Asia/Bangkok': 'Thailand',
        'Asia/Singapore': 'Singapore',
        'Asia/Dubai': 'UAE',
        'Europe/London': 'United Kingdom',
        'Europe/Paris': 'France',
        'Europe/Berlin': 'Germany',
        'Europe/Rome': 'Italy',
        'America/New_York': 'United States',
        'America/Los_Angeles': 'United States',
        'America/Chicago': 'United States',
        'America/Denver': 'United States',
        'America/Toronto': 'Canada',
        'America/Vancouver': 'Canada',
        'Australia/Sydney': 'Australia',
        'Australia/Melbourne': 'Australia',
        'Pacific/Auckland': 'New Zealand',
        // Add more as needed
      };
      
      const country = timezoneToCountry[browserTimezone] || browserTimezone.split('/')[0] || 'Local';
      
      console.log('Final browser fallback result:', { city, country, timezone: browserTimezone });
      
      return NextResponse.json({
        city: city,
        country: country,
        timezone: browserTimezone,
        source: 'browser'
      });
    }

    console.log('IP detection successful:', data);
    return NextResponse.json({
      city: data.city || 'Unknown City',
      country: data.country_name || 'Unknown Country',
      timezone: data.timezone,
      source: 'ip',
      ip: ipToCheck
    });
  } catch (error) {
    console.error('IP timezone detection error:', error);
    
    // Ultimate fallback to browser timezone
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const city = browserTimezone.split('/').pop()?.replace(/_/g, ' ') || 'Local';
    const country = browserTimezone.split('/')[0] || 'Local';
    
    return NextResponse.json({
      city: city,
      country: country,
      timezone: browserTimezone,
      source: 'browser'
    });
  }
}