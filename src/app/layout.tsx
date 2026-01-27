import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/providers/Web3Provider";
import { Header } from "@/components/layout/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nethermind Bridge",
  description: "Bridge assets between Ethereum and OP Stack chains",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen`}>
        <Web3Provider>
          {/* Gradient orb background */}
          <div className="gradient-orb" />
          
          <Header />
          <main className="pt-20 pb-12 relative z-10">
            {children}
          </main>
          
          {/* Footer */}
          <footer className="fixed bottom-0 left-0 right-0 py-4 border-t border-white/5 bg-black/20 backdrop-blur-xl z-50">
            <div className="container mx-auto px-4 flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center gap-6">
                <a href="https://nethermind.io" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  Nethermind
                </a>
                <a href="https://docs.optimism.io" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  Docs
                </a>
              </div>
              <div>
                © 2026 Nethermind Bridge
              </div>
            </div>
          </footer>
        </Web3Provider>
      </body>
    </html>
  );
}
