"use client";

import Header from "../components/header";
import Footer from "../components/footer";
import CharacterEditSection from "../components/character-edit-section";
import CoverEditSection from "../components/cover-edit-section";
import PageEditSection from "../components/page-edit-section";

import { useSelectSectionStore } from "../store/useSelectSectionStore";

import { useSelectModalStore } from "../store/useModalStateStore";

import {
  useScreenSizeListener,
  useScreenSizeStore,
} from "@/app/store/useScreenSizeStore";

import "../globals.css";

import { useEffect } from "react";

export default function CreatePage() {
  useScreenSizeListener();
  const { section, setSection } = useSelectSectionStore();
  const { isLgUp } = useScreenSizeStore();

  useEffect(() => {
    scrollToTop();
  }, [section]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const { open } = useSelectModalStore();

  useEffect(() => {
    if (open && !isLgUp) {
      document.body.classList.add("overflow-y-hidden");
    } else if (!open && !isLgUp) {
      document.body.classList.remove("overflow-y-hidden");
    }
  }, [open, isLgUp]);

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
