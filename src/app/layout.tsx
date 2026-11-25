import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import { getStorefrontConfig } from "@/lib/storefront";
import StoreChrome from "@/components/StoreChrome";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport = { themeColor: "#bf4268" };

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  manifest: "/manifest.webmanifest",
  title: "Ripzy — Premium Modern E-Commerce Platform",
  description:
    "Explore flagship noise-cancelling audio, custom CNC mechanical keyboards, and minimalist everyday carry gadgets with fast delivery and Razorpay checkout on Ripzy.",
  openGraph: {
    title: "Ripzy — Next-Gen E-Commerce",
    description: "Curated premium electronics & workspaces.",
    url: "https://ripzy.com",
    siteName: "Ripzy",
    locale: "en_IN",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const storefront = await getStorefrontConfig();
  return (
    <html lang="en" className={`${outfit.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-[#fbf8f7] text-slate-800 selection:bg-indigo-200 selection:text-indigo-900">
        <Providers storefront={storefront}>
          <StoreChrome>{children}</StoreChrome>
          <ServiceWorkerRegister />
        </Providers>
      </body>
    </html>
  );
}
