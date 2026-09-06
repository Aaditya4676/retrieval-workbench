import type { Metadata, Viewport } from "next";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import "./globals.css";
// Native browser chrome shares the CSS token source, including both system schemes.
const surfaceColors = [
  ...readFileSync(
    join(process.cwd(), "app/design-tokens.css"),
    "utf8",
  ).matchAll(/--color-surface:\s*(#[\da-f]{6});/gi),
].map((match) => match[1]);
if (surfaceColors.length !== 2)
  throw new Error(
    "Provide light and dark surface tokens for browser theme colors",
  );
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: surfaceColors[0] },
    { media: "(prefers-color-scheme: dark)", color: surfaceColors[1] },
  ],
};
export const metadata: Metadata = {
  title: "Retrieval workbench — Aaditya Khedekar",
  description:
    "Inspect keyword, MiniLM vector and hybrid retrieval over pinned frontend documentation.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preload"
          href="/fonts/source-sans-3-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/literata-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
