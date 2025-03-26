import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TeamProvider } from "@/lib/contexts/TeamContext";

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
    <html lang="en">
      <body className={inter.className}>
        <TeamProvider>
          {children}
        </TeamProvider>
      </body>
    </html>
  );
}
