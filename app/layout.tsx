import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SwRegister } from "@/components/sw-register";

const now = localFont({
  variable: "--font-now",
  src: [
    { path: "../public/fonts/Now-Thin.otf", weight: "100", style: "normal" },
    { path: "../public/fonts/Now-Light.otf", weight: "300", style: "normal" },
    { path: "../public/fonts/Now-Regular.otf", weight: "400", style: "normal" },
    { path: "../public/fonts/Now-Medium.otf", weight: "500", style: "normal" },
    { path: "../public/fonts/Now-Bold.otf", weight: "700", style: "normal" },
    { path: "../public/fonts/Now-Black.otf", weight: "900", style: "normal" },
  ],
});

export const metadata: Metadata = {
  title: "Vekio Engenharia — Sistema de Gestão",
  description: "Gestão de obras, financeiro e clientes da Vekio Engenharia",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Vekio",
  },
};

export const viewport: Viewport = {
  themeColor: "#424431",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${now.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{if(localStorage.getItem("vekio-tema")==="dark")document.documentElement.classList.add("dark")}catch(e){}',
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-muted/30">
        {children}
        <Toaster />
        <SwRegister />
      </body>
    </html>
  );
}
