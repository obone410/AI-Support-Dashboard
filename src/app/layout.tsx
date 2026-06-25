import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://ai-support-dashboard-navy.vercel.app"),
  title: {
    default: "AI Support Agent Dashboard",
    template: "%s | Eyitayo Oyedo"
  },
  description:
    "A portfolio-ready support operations dashboard with AI ticket triage, auth-ready flows, Supabase storage, and deployment monitoring.",
  applicationName: "AI Support Agent Dashboard",
  authors: [{ name: "Eyitayo Oyedo" }],
  creator: "Eyitayo Oyedo",
  openGraph: {
    title: "AI Support Agent Dashboard",
    description:
      "AI support operations dashboard with ticket triage, SLA monitoring, evaluation logs, and secure API flows.",
    url: "/",
    siteName: "Eyitayo Oyedo Portfolio",
    type: "website"
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
