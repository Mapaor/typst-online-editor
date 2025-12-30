import type { Metadata } from "next";
import "./globals.css";
import "./pdfjs-textlayer.css";

export const metadata: Metadata = {
  title: "Typst Online",
  description: "Edit and compile Typst documents thanks to WebAssembly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
