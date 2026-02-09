"use client";

export default function EditPageNav() {
  return (
    <nav aria-label="Editor tabs" className="edit-nav">
      <button
        id="tab-characters-btn"
        role="tab"
        aria-selected="true"
        aria-controls="tab-characters"
        tabIndex={0}
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
        className="active"
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
      >
        <i className="bi bi-book"></i>
        გვერდები
      </button>
    </nav>
  );
}
