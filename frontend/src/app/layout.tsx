import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../lib/auth-context";
import { Toaster } from "sonner";
import { Outfit, Montserrat } from "next/font/google";
import { cn } from "../lib/utils";
import { ThemeProvider } from "next-themes";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-heading",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Nagyees Laundry Service — Management System",
  description: "Laundry shop management: orders, payments, and customer notifications.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={cn( outfit.variable, montserrat.variable, "font-sans")}>
      <body>
          <AuthProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
              {children}
              <Toaster richColors position="top-right" />
            </ThemeProvider>
         </AuthProvider>
      </body>
    </html>
  );
}
