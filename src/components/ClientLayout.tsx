'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { isMobile } from '@/lib/utils/deviceUtils';

// Dynamically import the MobileAppShell with client-side only rendering
const MobileAppShell = dynamic(
  () => import('./mobile/MobileAppShell'),
  { ssr: false }
);

interface ClientLayoutProps {
  children: React.ReactNode;
}

/**
 * Client-side layout wrapper that handles dynamic imports
 * This is necessary because 'ssr: false' cannot be used in Server Components
 */
export default function ClientLayout({ children }: ClientLayoutProps) {
  // Track if we're on the client and if it's a mobile device
  const [isMounted, setIsMounted] = useState(false);
  const [isOnMobile, setIsOnMobile] = useState(false);

  // Initialize state after component mounts
  useEffect(() => {
    setIsMounted(true);
    setIsOnMobile(isMobile());
    
    // Handle resize events
    const handleResize = () => {
      setIsOnMobile(isMobile());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Server-side or during hydration, render just the children
  if (!isMounted) {
    return <>{children}</>;
  }

  // For mobile devices, wrap children in MobileAppShell
  if (isOnMobile) {
    return <MobileAppShell>{children}</MobileAppShell>;
  }
  
  // For desktop, just render the children
  return <>{children}</>;
} 