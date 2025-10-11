import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pomodoro Timer App",
  description:
    "A minimal Pomodoro timer with customizable sessions built with Next.js, TypeScript, Tailwind, and Sera UI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="min-h-screen bg-slate-100 text-slate-900 antialiased transition-colors dark:bg-slate-950 dark:text-slate-100 font-sans"
      >
        {children}
      </body>
    </html>
  );
}
