import type { Dispatch, SetStateAction } from "react";

type CollapsibleMenuProps = {
  setMenuOpen: Dispatch<SetStateAction<boolean>>;
  menuOpen: boolean;
};

export default function CollapsibleMenu({
  menuOpen,
  setMenuOpen,
}: CollapsibleMenuProps) {
  return (
    <div
      className={` md:hidden
        overflow-hidden transition-[max-height,opacity] duration-400 ease-out
        ${menuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}
      `}
    >
      <nav className="header-nav">
        <ul className="space-y-4">
          <li onClick={() => setMenuOpen(false)}>
            <a href="#prices-article">ფასები</a>
          </li>
          <li onClick={() => setMenuOpen(false)}>
            <a href="#steps-article">როგორ მუშაობს</a>
          </li>
          <li onClick={() => setMenuOpen(false)}>
            <a className="header-action-menu" href="#prices-article">
              შეუკვეთე
            </a>
          </li>
        </ul>
      </nav>
    </div>
  );
}
