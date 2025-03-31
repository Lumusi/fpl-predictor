'use client';

import { ThemeProvider } from "next-themes";
import { SWRConfig } from "swr";
import { TeamProvider } from "../lib/contexts/TeamContext";
import { defaultSWRConfig } from "../lib/hooks/useSWRConfig";
import ClientLayout from "@/components/ClientLayout";
import DebugToggle from "@/components/DebugToggle";

interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * Client-side providers wrapper
 * This separates client components from server components in the layout
 */
export default function Providers({ children }: ProvidersProps) {
  return (
    <SWRConfig value={defaultSWRConfig}>
      <ThemeProvider 
        attribute="class"
        defaultTheme="system"
        enableSystem={true}
        disableTransitionOnChange={false}
        storageKey="theme"
      >
        <TeamProvider>
          <ClientLayout>
            {children}
          </ClientLayout>
          <DebugToggle />
        </TeamProvider>
      </ThemeProvider>
    </SWRConfig>
  );
} 