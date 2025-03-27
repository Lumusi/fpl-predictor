import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TeamProvider } from "../lib/contexts/TeamContext";
import { ThemeProvider } from "next-themes";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FPL Predictor - Fantasy Premier League Points Prediction Tool",
  description: "Predict player performance in Fantasy Premier League (FPL) for upcoming gameweeks and optimize your team",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-light-background text-light-text-primary dark:bg-dark-background dark:text-dark-text-primary transition-colors duration-300`}>
        <ThemeProvider 
          attribute="class"
          defaultTheme="system"
          enableSystem={true}
          disableTransitionOnChange={false}
          storageKey="theme"
        >
          <TeamProvider>
            {children}
          </TeamProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
