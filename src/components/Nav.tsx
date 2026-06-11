"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["/lounge", "Lounge"],
  ["/news", "News"],
  ["/passport", "Passport"],
  ["/crews", "Crews"],
  ["/sessions", "Sessions"],
  ["/feed", "Feed"],
  ["/events", "Events"],
];

export default function Nav() {
  const pathname = usePathname();

  if (pathname === "/" || pathname === "/signup") return null;

  return (
    <>
      <header className="nav">
        <div className="nav-inner">
          <Link className="brand" href="/lounge" aria-label="Base6 lounge">
            <span className="logo-mark">B6</span>
            <span>BASE6</span>
          </Link>
          <nav className="nav-links" aria-label="Main navigation">
            {links.map(([href, label]) => (
              <Link key={href} href={href}>{label}</Link>
            ))}
            <Link href="/signup" className="button primary">Board Flight</Link>
          </nav>
        </div>
      </header>
      <nav className="mobile-dock" aria-label="Mobile navigation">
        <Link href="/lounge"><span>🛫</span>Home</Link>
        <Link href="/news"><span>📰</span>News</Link>
        <Link href="/passport"><span>📘</span>Passport</Link>
        <Link href="/crews"><span>👥</span>Crews</Link>
        <Link href="/sessions"><span>📍</span>LFG</Link>
      </nav>
    </>
  );
}
