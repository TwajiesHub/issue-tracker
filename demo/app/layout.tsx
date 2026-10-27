import type { Metadata } from "next";
import { Manrope, Geist_Mono } from "next/font/google";
import { StoreProvider } from "@/lib/store";
import { AppHeader } from "@/components/header";
import { DemoPanel } from "@/components/demo-panel";
import { LiveStatus } from "@/components/live-status";
import "./globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Ziki", template: "%s · Ziki" },
  description: "Ziki Guard interaction demo (standalone, fictional data).",
};

// Applies a saved theme before first paint. With nothing saved, the device setting decides (CSS).
const themeScript = `try{var t=localStorage.getItem("zg-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="overflow-x-clip" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${manrope.variable} ${geistMono.variable} min-h-screen overflow-x-clip antialiased`}>
        <StoreProvider>
          <div data-app-shell="" className="flex min-h-screen flex-col bg-zk-bg">
            <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-zk-surface focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-zk-accent">
              Skip to content
            </a>
            <AppHeader />
            <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-28 focus:outline-none sm:px-6 lg:pb-10">
              {children}
            </main>
            <LiveStatus />
            <DemoPanel />
          </div>
        </StoreProvider>
      </body>
    </html>
  );
}
