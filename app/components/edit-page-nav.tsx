"use client";

import { useSelectSectionStore } from "../store/useSelectSectionStore";

import { useEffect } from "react";

export default function EditPageNav() {
  const { section, setSection } = useSelectSectionStore();

  useEffect(() => {
    console.log(section);
  }, [section]);

  return (
    <nav aria-label="Editor tabs" className="edit-nav">
      <button
        id="tab-characters-btn"
        role="tab"
        aria-selected="true"
        aria-controls="tab-characters"
        tabIndex={0}
        className={section === "character" ? "active" : ""}
        onClick={() => {
          setSection("character");
        }}
      >
        <i className="bi bi-person-fill-add"></i>
        პერსონაჟები
      </button>
      <button
        id="tab-cover-btn"
        role="tab"
        aria-selected="false"
        aria-controls="tab-cover"
        tabIndex={-1}
        className={section === "cover" ? "active" : ""}
        onClick={() => {
          setSection("cover");
        }}
      >
        <i className="bi bi-book-half"></i>
        ყდა
      </button>
      <button
        id="tab-pages-btn"
        role="tab"
        aria-selected="false"
        aria-controls="tab-pages"
        tabIndex={-1}
        className={section === "pages" ? "active" : ""}
        onClick={() => {
          setSection("pages");
        }}
      >
        <i className="bi bi-book"></i>
        გვერდები
      </button>
    </nav>
  );
}
