import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FPL Predictor - Fantasy Premier League Points Prediction Tool",
  description: "Predict player performance in Fantasy Premier League (FPL) for upcoming gameweeks and optimize your team",
  icons: {
    icon: '/premier-league-logo.svg',
    apple: '/premier-league-logo.svg',
  },
  // Add mobile-specific metadata
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
  themeColor: "#37003C", // Premier League purple color
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FPL Predictor"
  },
  manifest: "/manifest.json"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-light-background text-light-text-primary dark:bg-dark-background dark:text-dark-text-primary transition-colors duration-300`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
