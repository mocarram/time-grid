import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get the client's IP address
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const vercelIp = request.headers.get('x-vercel-forwarded-for');
    const clientIp = forwarded?.split(',')[0]?.trim() || 
                     vercelIp?.split(',')[0]?.trim() || 
                     realIp || 
                     request.ip || 
                     '127.0.0.1';
    
    console.log('Detected IP:', clientIp);
    
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
              headers: service.headers,
              timeout: 5000
            });
            
            if (response.ok) {
              const serviceData = await response.json();
              console.log(`${service.name} response:`, serviceData);
              
              if (service.name === 'ipapi.co' && serviceData.timezone && !serviceData.error) {
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
    if (!data || data.error || !data.timezone) {
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      console.log('Using browser timezone fallback:', browserTimezone);
      
      // Try to get a better city name from the timezone
      const timezoneParts = browserTimezone.split('/');
      const cityFromTimezone = timezoneParts[timezoneParts.length - 1]?.replace('_', ' ') || 'Local';
      
      return NextResponse.json({
        city: cityFromTimezone,
        country: timezoneParts[0] || 'Local',
        timezone: browserTimezone,
        source: 'browser'
      });
    }

    console.log('IP detection successful:', data);
    return NextResponse.json({
      city: data.city || 'Unknown City',
      country: data.country_name || data.country || 'Unknown Country',
      timezone: data.timezone,
      source: 'ip',
      ip: ipToCheck
    });
  } catch (error) {
    console.error('IP timezone detection error:', error);
    
    // Ultimate fallback to browser timezone
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timezoneParts = browserTimezone.split('/');
    const cityFromTimezone = timezoneParts[timezoneParts.length - 1]?.replace('_', ' ') || 'Local';
    
    return NextResponse.json({
      city: cityFromTimezone,
      country: timezoneParts[0] || 'Local',
      timezone: browserTimezone,
      source: 'browser'
    });
  }
}