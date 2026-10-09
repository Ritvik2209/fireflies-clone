import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";

import { AppToaster } from "@/components/layout/AppToaster";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { TourProvider } from "@/components/tour/TourProvider";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: "Glowworm", template: "%s · Glowworm" },
  description: "Meeting library, synced transcripts and AI notes: a Fireflies.ai clone.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: next-themes adds class="dark" to <html> before React loads, so that
    // attribute differs from the server HTML on purpose.
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="bg-surface font-sans text-gray-900 antialiased">
        {/* Adds class="dark" to <html> in dark mode, follows the system setting until the user
            picks a theme, and remembers that choice in localStorage. */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* The optional intro tour spans pages, so it wraps the whole shell. */}
          <TourProvider>
            <div className="flex h-screen">
              <Sidebar />
              <div className="flex min-w-0 flex-1 flex-col">
                <Topbar />
                {/* relative: absolutely positioned children (e.g. sr-only text) stay inside main's
                scroll area instead of stretching the whole document. */}
                <main className="relative flex-1 overflow-y-auto">{children}</main>
              </div>
            </div>
          </TourProvider>
          <AppToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
