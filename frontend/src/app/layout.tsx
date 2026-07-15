import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../lib/auth-context";
import { ThemeProvider } from "../components/theme-provider";
import { Toaster } from "sonner";
import { Outfit, Montserrat } from 'next/font/google'
import { cn } from '../lib/utils'

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
});

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Nagyees Laundry Service — Management System",
  description: "Laundry shop management: orders, payments, and customer notifications.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning  className={cn(outfit.variable, montserrat.variable, 'font-sans')}>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider>
            {children}
            <Toaster richColors position="top-right" />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
