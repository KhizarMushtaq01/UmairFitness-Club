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
      <body className={`${anton.variable} ${bebas.variable} ${inter.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}
