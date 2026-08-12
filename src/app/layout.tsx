import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ClerkProvider, Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LifeOS — Command Center",
  description: "Personal command center and daily priority stack.",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-zinc-950 text-zinc-50">
        <ClerkProvider>
          <header className="fixed right-6 top-6 z-[60] flex items-center gap-3">
            <Show when="signed-out">
              <SignInButton mode="modal">
                <Button variant="ghost" className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 transition-all rounded-full px-5">
                  Sign in
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button className="bg-white text-zinc-950 hover:bg-zinc-200 font-semibold shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all rounded-full px-6">
                  Get Started
                </Button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <UserButton 
                appearance={{
                  elements: {
                    userButtonAvatarBox: "size-9 border border-zinc-800",
                  }
                }} 
              />
            </Show>
          </header>
          <Sidebar />
          <main className="min-h-screen md:pl-64 pt-16 md:pt-0">
            <div className="max-w-6xl mx-auto w-full p-6 md:p-12 lg:p-24">
              {children}
            </div>
          </main>
        </ClerkProvider>
        <Analytics />
      </body>
    </html>
  );
}
