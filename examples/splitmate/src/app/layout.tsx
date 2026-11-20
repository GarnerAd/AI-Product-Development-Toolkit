import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { site } from "@/lib/site";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col">
        <header className="sticky top-0 z-10 border-b border-border bg-surface/85 backdrop-blur">
          <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-lg text-sm font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            >
              <span
                aria-hidden
                className="grid size-7 place-items-center rounded-lg bg-accent text-xs text-accent-contrast"
              >
                S
              </span>
              {site.name}
            </Link>
            <span className="hidden text-xs text-muted sm:block">{site.tagline}</span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
          {children}
        </main>

        <footer className="mx-auto w-full max-w-4xl px-4 pb-8 text-xs text-muted sm:px-6">
          Runs on your machine. No accounts, no bank connections; amounts are kept in whole cents.
        </footer>
      </body>
    </html>
  );
}
