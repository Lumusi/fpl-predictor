import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TeamProvider } from "../lib/contexts/TeamContext";
import { ThemeProvider } from "next-themes";
import { SWRConfig } from "swr";
import { defaultSWRConfig } from "../lib/hooks/useSWRConfig";
import DebugToggle from "@/components/DebugToggle";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FPL Predictor - Fantasy Premier League Points Prediction Tool",
  description: "Predict player performance in Fantasy Premier League (FPL) for upcoming gameweeks and optimize your team",
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-light-background text-light-text-primary dark:bg-dark-background dark:text-dark-text-primary transition-colors duration-300`}>
        <SWRConfig value={defaultSWRConfig}>
          <ThemeProvider 
            attribute="class"
            defaultTheme="system"
            enableSystem={true}
            disableTransitionOnChange={false}
            storageKey="theme"
          >
            <TeamProvider>
              {children}
              <DebugToggle />
            </TeamProvider>
          </ThemeProvider>
        </SWRConfig>
      </body>
    </html>
  );
}
