import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorker from "@/components/ServiceWorker";
import { JsonLd } from "@/components/JsonLd";
import { rootMetadata, webAppJsonLd, SITE } from "@/lib/seo";

export const metadata: Metadata = rootMetadata();

export const viewport: Viewport = {
  themeColor: "#f5f5f5",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang={SITE.lang}>
      <body className="min-h-dvh">
        <JsonLd data={webAppJsonLd()} />
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
