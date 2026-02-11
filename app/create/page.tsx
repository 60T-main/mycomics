"use client";

import Header from "../components/header";
import Footer from "../components/footer";
import CharacterEditSection from "../components/character-edit-section";
import CoverEditSection from "../components/cover-edit-section";
import PageEditSection from "../components/page-edit-section";

import { useSelectSectionStore } from "../store/useSelectSectionStore";

import "../globals.css";

import { useState, useEffect } from "react";

export default function CreatePage() {
  const { section, setSection } = useSelectSectionStore();

  useEffect(() => {
    scrollToTop();
  }, [section]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <>
      <Header location={"edit"}></Header>
      <main className="edit-page">
        {section === "character" && (
          <CharacterEditSection></CharacterEditSection>
        )}
        {section === "cover" && <CoverEditSection></CoverEditSection>}
        {section === "pages" && <PageEditSection></PageEditSection>}
      </main>
      <Footer></Footer>
    </>
  );
}
