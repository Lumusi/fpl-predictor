'use client';

import { isMobile, isTablet } from './deviceUtils';

/**
 * Gets an appropriately sized image URL based on the current device
 * @param originalUrl The original image URL
 * @param options Configuration options
 * @returns The optimized image URL
 */
export function getOptimizedImageUrl(
  originalUrl: string, 
  options: {
    mobileWidth?: number;
    tabletWidth?: number;
    desktopWidth?: number;
    format?: 'webp' | 'jpeg' | 'png' | 'avif';
    quality?: number;
  } = {}
): string {
  // Default options
  const {
    mobileWidth = 240,
    tabletWidth = 320,
    desktopWidth = 480,
    format = 'webp',
    quality = 80
  } = options;

  // Determine appropriate width based on device
  let width = desktopWidth;
  if (isMobile()) width = mobileWidth;
  else if (isTablet()) width = tabletWidth;

  // Check if we have an external image service like Imgix or Cloudinary
  // (this is where you would integrate with your image optimization service)
  if (originalUrl.includes('cloudinary.com')) {
    return optimizeCloudinaryUrl(originalUrl, width, format, quality);
  }
  
  // For local images, rely on Next.js built-in image optimization if available
  if (originalUrl.startsWith('/') && typeof window !== 'undefined') {
    // Construct optimized image path
    return `/_next/image?url=${encodeURIComponent(originalUrl)}&w=${width}&q=${quality}`;
  }
  
  // For other external images, return the original URL
  return originalUrl;
}

/**
 * Creates a Cloudinary optimized URL
 */
function optimizeCloudinaryUrl(
  url: string, 
  width: number, 
  format: string, 
  quality: number
): string {
  // Extract the base URL and the path
  const matches = url.match(/(.+)\/upload\/(.+)/);
  if (!matches) return url;
  
  const [, baseUrl, path] = matches;
  
  // Construct the optimized URL
  return `${baseUrl}/upload/w_${width},f_${format},q_${quality}/${path}`;
}

/**
 * Preloads images to improve perceived performance
 * @param imageUrls Array of image URLs to preload
 * @param priority If true, images are loaded immediately; otherwise, they're loaded after the page loads
 */
export function preloadImages(imageUrls: string[], priority: boolean = false): void {
  // Skip preloading on mobile if not priority to save bandwidth
  if (isMobile() && !priority) return;
  
  // Use requestIdleCallback for non-priority images if available
  const loadImages = () => {
    imageUrls.forEach(url => {
      const img = new Image();
      img.src = getOptimizedImageUrl(url);
    });
  };
  
  if (priority) {
    loadImages();
  } else if (typeof window !== 'undefined') {
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(loadImages);
    } else {
      // Fallback for browsers that don't support requestIdleCallback
      setTimeout(loadImages, 1000);
    }
  }
}

/**
 * Generates a responsive image srcSet based on device needs
 * @param baseUrl The base image URL
 * @param widths Array of widths for different device sizes
 * @param options Additional options for image optimization
 * @returns srcSet string for use in <img> tags
 */
export function generateSrcSet(
  baseUrl: string,
  widths: number[] = [240, 480, 640, 768, 1024, 1280],
  options: { format?: 'webp' | 'jpeg' | 'png' | 'avif'; quality?: number } = {}
): string {
  return widths
    .map(width => {
      const optimizedUrl = getOptimizedImageUrl(baseUrl, {
        ...options,
        mobileWidth: width,
        tabletWidth: width,
        desktopWidth: width
      });
      return `${optimizedUrl} ${width}w`;
    })
    .join(', ');
}

/**
 * Creates props for an optimized <img> tag
 * @param src The source image URL
 * @param options Optimization options
 * @returns Props object for an <img> element
 */
export function getOptimizedImageProps(
  src: string,
  options: {
    alt: string;
    width?: number;
    height?: number;
    loading?: 'lazy' | 'eager';
    decoding?: 'async' | 'sync' | 'auto';
    className?: string;
    sizes?: string;
    format?: 'webp' | 'jpeg' | 'png' | 'avif';
    quality?: number;
    priority?: boolean;
  }
): React.ImgHTMLAttributes<HTMLImageElement> {
  // Extract options with defaults
  const {
    alt,
    width,
    height,
    loading = isMobile() ? 'lazy' : 'eager',
    decoding = 'async',
    className,
    sizes = isMobile() 
      ? '100vw' // Mobile devices are full width
      : '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw',
    format = isMobile() ? 'webp' : 'webp', // webp for all but could use avif for more modern browsers
    quality = isMobile() ? 40 : 80, // Lower quality for mobile
    priority = false
  } = options;

  // Generate smaller widths for mobile to reduce network payload
  const widths = isMobile() 
    ? [120, 240, 320, 480] // Smaller sizes for mobile
    : [240, 480, 640, 768, 1024, 1280];
  
  // For mobile, add fetchPriority="low" to deprioritize image loading
  const fetchPriority = !priority && isMobile() ? 'low' : undefined;
  
  return {
    src: getOptimizedImageUrl(src, { 
      format, 
      quality,
      mobileWidth: isMobile() ? Math.min(width || 320, 320) : undefined
    }),
    srcSet: generateSrcSet(src, widths, { format, quality }),
    alt,
    width,
    height,
    loading,
    decoding,
    className,
    sizes,
    fetchPriority
  };
}

// Add a new function to batch load images in priority order
let batchQueue: { src: string, callback: () => void }[] = [];
let isBatchProcessing = false;

export function batchLoadImages(maxConcurrent = 2) {
  if (isBatchProcessing || batchQueue.length === 0) return;
  
  isBatchProcessing = true;
  
  // Process up to maxConcurrent images at once
  const batch = batchQueue.splice(0, maxConcurrent);
  let completed = 0;
  
  batch.forEach(item => {
    const img = new Image();
    img.onload = img.onerror = () => {
      // Call the callback when image loads or errors
      item.callback();
      
      // When all in this batch are done, process the next batch
      completed++;
      if (completed === batch.length) {
        isBatchProcessing = false;
        if (batchQueue.length > 0) {
          // Small delay to prevent UI thread blocking
          setTimeout(() => batchLoadImages(maxConcurrent), 100);
        }
      }
    };
    img.src = item.src;
  });
}

// Queue an image for batch loading
export function queueImageLoad(src: string): Promise<void> {
  return new Promise(resolve => {
    batchQueue.push({ src, callback: resolve });
    if (!isBatchProcessing) {
      // Start processing if not already running
      // Use requestIdleCallback if available for better performance
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => batchLoadImages(isMobile() ? 2 : 4));
      } else {
        setTimeout(() => batchLoadImages(isMobile() ? 2 : 4), 100);
      }
    }
  });
} 