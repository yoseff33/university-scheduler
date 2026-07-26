import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const socialImage = new URL("/og.png", `${protocol}://${host}`).toString();

  return {
    title: {
      default: "مِرسى | طلب القهوة من سيارتك",
      template: "%s | مِرسى",
    },
    description:
      "منصة عربية متكاملة لطلب القهوة من السيارة، متابعة الطلب، والولاء الرقمي.",
    manifest: "/manifest.webmanifest",
    icons: {
      icon: "/icon.svg",
      shortcut: "/icon.svg",
    },
    applicationName: "مِرسى",
    appleWebApp: {
      capable: true,
      title: "مِرسى",
      statusBarStyle: "black-translucent",
    },
    openGraph: {
      title: "مِرسى | قهوتك تصل لعندك",
      description: "اطلب قهوتك، تابع تجهيزها، واستلمها عند سيارتك.",
      locale: "ar_SA",
      type: "website",
      images: [{ url: socialImage, width: 1200, height: 630, alt: "مِرسى — قهوتك تصل لعندك" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "مِرسى | قهوتك تصل لعندك",
      description: "اطلب قهوتك، تابع تجهيزها، واستلمها عند سيارتك.",
      images: [socialImage],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
