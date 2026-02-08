"use client";

import CollapsibleMenu from "./collapsible-menu";

import { useState, useEffect, useRef } from "react";

export default function Header() {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target;
      if (target instanceof Node && !menuRef.current?.contains(target)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header ref={menuRef}>
      <div className="effect"></div>
      <div className="tint"></div>
      <div className="shine"></div>
      <div className="header-content">
        <div className="dock h-20">
          <img
            className="header-logo"
            src="logo.png"
            alt="website logo 'mycomics.ge'"
          />
          <div className="header-links">
            <a className="header-prices" href="#prices-article">
              ფასები
            </a>
            <a className="header-action" href="/">
              შეკვეთა
            </a>
          </div>
          <button
            className="md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
          >
            <i className="bi bi-list"></i>
          </button>
        </div>
        <CollapsibleMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      </div>
    </header>
  );
}
