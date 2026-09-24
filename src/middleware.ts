import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Lightweight in-memory rate limiter for Edge
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = request.ip || (forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1');
    
    // Set a generous limit because /api/poster is called for every image on the page
    const limit = 500; // 500 requests per minute per IP
    const windowMs = 60 * 1000;
    const now = Date.now();
    
    let record = rateLimitMap.get(ip);
    
    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
    } else {
      record.count += 1;
    }
    
    rateLimitMap.set(ip, record);
    
    if (record.count > limit) {
      return new NextResponse(
        JSON.stringify({ error: 'Too Many Requests' }),
        { 
          status: 429,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Cleanup old records probabilistically to prevent memory leak
    if (Math.random() < 0.01) {
      rateLimitMap.forEach((value, key) => {
        if (now > value.resetTime) {
          rateLimitMap.delete(key);
        }
      });
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};