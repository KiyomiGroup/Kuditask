import type { Metadata } from "next";
import { ToastProvider } from "@/components/feedback/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "KudiTask",
  description: "Nigeria-first micro-task marketplace",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Same font/icon loadout as the Stitch-exported screens — do not swap these. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
          rel="stylesheet"
        />
        <link href="https://fonts.googleapis.com" rel="preconnect" />
        <link crossOrigin="" href="https://fonts.gstatic.com" rel="preconnect" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&family=Space+Grotesk:wght@600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-on-surface min-h-screen selection:bg-secondary-container selection:text-on-secondary-container">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
