import type { Metadata, Viewport } from "next";
import "./globals.css";
import "../components/crews/CrewStyles.css";
import "../components/passport/PassportStyles.css";
import "../components/onboarding/OnboardingStyles.css";
import "../components/passport/PassportStampAwardStyles.css";
import Nav from "@/components/Nav";
import PassportStampAward from "@/components/passport/PassportStampAward";
import { site } from "@/theme";

export const metadata: Metadata = {
  title: site.title,
  description: site.description,
  applicationName: site.name,
  metadataBase: new URL(site.url),
  openGraph: {
    title: site.title,
    description: site.description,
    type: "website",
    siteName: site.name,
  },
};

export const viewport: Viewport = {
  themeColor: "#0d1117",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main className="app-shell">{children}</main>
        <PassportStampAward />
      </body>
    </html>
  );
}
