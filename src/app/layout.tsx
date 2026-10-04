import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.STORE_URL || "http://localhost:3000"),
  title: {
    default: "Aarohi — Modern essentials for India",
    template: "%s · Aarohi",
  },
  description:
    "Shop bags, audio, watches, home and apparel. Crafted slowly, priced in INR, delivered pan-India. Pay with UPI, cards and net banking via Cashfree.",
  openGraph: {
    title: "Aarohi — Modern essentials for India",
    description: "A considered edit of everyday objects.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <body className="min-h-screen font-sans antialiased">
        <Providers>
          <a href="#main" className="skip-link">
            Skip to content
          </a>
          <Header />
          <main id="main">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
