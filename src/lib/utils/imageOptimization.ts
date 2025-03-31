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
    sizes = '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw',
    format = 'webp',
    quality = 80
  } = options;

  // Generate common widths for responsive images
  const widths = [240, 480, 640, 768, 1024, 1280];
  
  return {
    src: getOptimizedImageUrl(src, { format, quality }),
    srcSet: generateSrcSet(src, widths, { format, quality }),
    alt,
    width,
    height,
    loading,
    decoding,
    className,
    sizes
  };
} 