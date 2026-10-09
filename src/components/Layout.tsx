import type { ReactNode } from 'react';
import { Link } from 'wouter';
import { HOTLINES } from '../lib/labels';

function Hotlines({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${className}`}>
      <span>ฉุกเฉินโทร</span>
      {HOTLINES.map((h) => (
        <a key={h.number} href={`tel:${h.number}`} className="font-semibold text-white underline-offset-2 hover:underline">
          {h.number} <span className="font-normal text-slate-400">({h.label})</span>
        </a>
      ))}
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
          <Link href="/" className="text-base font-bold text-white">
            🌊 FloodWatch <span className="hidden font-normal text-slate-400 sm:inline">· ศูนย์กลางขอความช่วยเหลือน้ำท่วม</span>
          </Link>
          <Link
            href="/new"
            className="shrink-0 rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white shadow hover:bg-red-500"
          >
            🆘 ขอความช่วยเหลือ
          </Link>
        </div>
        <div className="border-t border-slate-800/80 bg-slate-900/60">
          <Hotlines className="mx-auto max-w-6xl px-4 py-1.5 text-xs text-slate-300" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-4">{children}</main>

      <footer className="border-t border-slate-800 text-xs text-slate-500">
        <div className="mx-auto max-w-6xl space-y-1 px-4 py-4">
          <Hotlines className="text-slate-400" />
          <p>FloodWatch เป็นพื้นที่ให้ประชาชนช่วยเหลือกันเอง ไม่ใช่หน่วยงานราชการ ข้อมูลในเว็บมาจากผู้ใช้</p>
        </div>
      </footer>
    </div>
  );
}
