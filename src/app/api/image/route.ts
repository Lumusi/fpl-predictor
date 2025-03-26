import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Cache for storing already loaded images to avoid repeated file reads
const imageCache = new Map<string, {buffer: ArrayBuffer, contentType: string, timestamp: number}>();
// Reduce cache duration to 5 minutes to ensure we get fresh images more frequently during development
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Clear the entire image cache
 */
function clearImageCache() {
  imageCache.clear();
  console.log('Image cache cleared');
}

/**
 * Get the fallback image path based on parameters
 */
function getFallbackImagePath(type: string): string {
  // We only support placeholder images now
  switch (type) {
    case 'shirt':
      return path.join(process.cwd(), 'public', 'images', 'placeholder-shirt.svg');
    case 'crest':
      return path.join(process.cwd(), 'public', 'images', 'placeholder-crest.svg');
    default:
      return path.join(process.cwd(), 'public', 'images', 'placeholder-shirt.svg');
  }
}

/**
 * API route that serves placeholder images for team kits and crests
 * 
 * @param request The incoming request with searchParams: type (shirt, crest), id, etc.
 * @returns A static placeholder image
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'shirt';
  const clearCache = searchParams.get('clearCache') === 'true';
  
  if (clearCache) {
    clearImageCache();
  }
  
  // Return a placeholder image
  const fallbackPath = getFallbackImagePath(type);
  const contentType = 'image/svg+xml'; // All placeholders are SVG
  
  try {
    const fallbackImage = fs.readFileSync(fallbackPath);
    return new NextResponse(fallbackImage, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        'X-Cache': 'PLACEHOLDER'
      }
    });
  } catch (fallbackError) {
    console.error('Fallback image error:', fallbackError);
    return new NextResponse('Image not found', { status: 404 });
  }
} 