import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { LightboxProvider } from "@/lib/lightbox";

export const metadata: Metadata = {
  title: "Riko's Toolbox",
  description:
    "Riko's Toolbox — interactive tools built by Fransiskus Magnis Pastoriko.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme:dark)').matches;if(t==='dark'||(t!=='light'&&d))document.documentElement.classList.add('dark')}catch(e){}})()`,
          }}
        />
      </head>
      <body suppressHydrationWarning className="min-h-screen">
        <LightboxProvider>
          <Nav />
          <main className="pb-8">{children}</main>
          <Footer />
        </LightboxProvider>
      </body>
    </html>
  );
}
