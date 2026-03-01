"use client";

import type {
  Dispatch,
  MouseEvent as ReactMouseEvent,
  SetStateAction,
} from "react";

import Link from "next/link";

type CollapsibleMenuProps = {
  setMenuOpen: Dispatch<SetStateAction<boolean>>;
  menuOpen: boolean;
};

export default function CollapsibleMenu({
  menuOpen,
  setMenuOpen,
}: CollapsibleMenuProps) {
  const onSectionClick = (
    e: ReactMouseEvent<HTMLAnchorElement>,
    sectionId: string,
  ) => {
    setMenuOpen(false);

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

  return (
    <div
      className={` md:hidden
        overflow-hidden transition-[max-height,opacity] duration-400 ease-out
        ${menuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}
      `}
    >
      <nav className="header-nav">
        <ul className="space-y-4">
          <li>
            <a
              href="/#prices-article"
              onClick={(e) => onSectionClick(e, "prices-article")}
            >
              ფასები
            </a>
          </li>
          <li>
            <a
              href="/#steps-article"
              onClick={(e) => onSectionClick(e, "steps-article")}
            >
              როგორ მუშაობს
            </a>
          </li>
          <li onClick={() => setMenuOpen(false)}>
            <Link className="header-action-menu" href="/create">
              შეკვეთა
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
