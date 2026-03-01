"use client";

import CollapsibleMenu from "./collapsible-menu";
import EditPageNav from "./edit-page-nav";

import Link from "next/link";
import type { MouseEvent as ReactMouseEvent } from "react";

import { useState, useEffect, useRef } from "react";

type HeaderProps = {
  location: string;
};

export default function Header({ location }: HeaderProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const onSectionClick = (
    e: ReactMouseEvent<HTMLAnchorElement>,
    sectionId: string,
  ) => {
    if (window.location.pathname !== "/") {
      return;
    }

    e.preventDefault();

    const section = document.getElementById(sectionId);
    if (!section) {
      return;
    }

    section.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `/#${sectionId}`);
  };

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
          <Link href="/">
            <img
              className="header-logo"
              src="/logo.png"
              alt="website logo 'mycomics.ge'"
            />
          </Link>

          <div className="header-links">
            <Link
              className="header-prices"
              href="/#prices-article"
              onClick={(e) => onSectionClick(e, "prices-article")}
            >
              ფასები
            </Link>
            <Link className="header-action" href="/create">
              შეკვეთა
            </Link>
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
      {location === "edit" && <EditPageNav></EditPageNav>}
    </header>
  );
}
