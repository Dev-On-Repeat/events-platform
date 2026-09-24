import type { Metadata } from "next";
import { DM_Sans, Space_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { Toaster } from "sonner";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-anton",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-terminal",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-flourish",
});

export const metadata: Metadata = {
  title: "HackB4 — Event Departures, Terminal 4",
  description:
    "HackB4 is a ticketing terminal for hackathons, cultural nights, robot wars and summits. Claim a pass, flash the QR, walk in.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${spaceMono.variable} ${instrumentSerif.variable} h-full antialiased scroll-smooth`}
    >
      <body className="flex min-h-full flex-col bg-ink text-bone">
        <div className="grain-overlay" aria-hidden />
        <ConvexClientProvider>
          <Header />
          <main className="flex flex-1 flex-col">{children}</main>
          <Footer />
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "#131311",
                color: "#EDE8DC",
                border: "1px solid #26261F",
                borderRadius: 0,
                fontFamily: "var(--font-terminal)",
                fontSize: "12px",
                letterSpacing: "0.04em",
              },
            }}
          />
        </ConvexClientProvider>
      </body>
    </html>
  );
}
