import { Anton, Bebas_Neue, Inter } from "next/font/google";
import "./globals.css";

const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-display" });
const bebas = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-heading" });
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark">
      {/* Extensions (Grammarly, ColorZilla, dark-mode tools) add attributes to
          <body> before React hydrates, which React reports as a mismatch we
          cannot fix from here. suppressHydrationWarning applies to this
          element alone, one level deep — mismatches inside our own components
          still surface, so this hides the noise without hiding real bugs. */}
      <body
        suppressHydrationWarning
        className={`${anton.variable} ${bebas.variable} ${inter.variable} font-sans`}
      >
        {children}
      </body>
    </html>
  );
}
