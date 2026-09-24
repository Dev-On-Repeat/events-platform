import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { Toaster } from "sonner";
import ScrollToTop from "@/components/ScrollToTop";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "HackB4 — Event Ticketing & Registration",
  description:
    "Event ticketing and registration platform with instant digital passes.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased scroll-smooth`}>
      <body className="min-h-full flex flex-col bg-gray-50/50 text-gray-900 selection:bg-blue-600 selection:text-white">
        <ConvexClientProvider>
          <Header />
          <main className="flex-1 flex flex-col">{children}</main>
          <footer className="border-t border-gray-200 bg-white py-8 px-4 sm:px-6 lg:px-8 text-center text-xs text-gray-500">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
              <p>© 2026 HackB4. Event ticketing and registration platform.</p>
              <div className="flex items-center gap-4">
                <span>Convex OCC Guaranteed</span>
                <span>•</span>
                <span>Razorpay Indian Payments</span>
                <span>•</span>
                <span>Secure QR Verification</span>
              </div>
            </div>
          </footer>
          <ScrollToTop />
          <Toaster richColors position="top-center" />
        </ConvexClientProvider>
      </body>
    </html>
  );
}
