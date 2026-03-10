"use client";

import Header from "../../components/header";
// import Footer from "../../components/footer";

import BookEditSection from "../../components/book-edit-section";

import { useSelectSectionStore } from "../../store/useSelectSectionStore";

import { useSelectModalStore } from "../../store/useModalStateStore";

import {
  useScreenSizeListener,
  useScreenSizeStore,
} from "@/app/store/useScreenSizeStore";

import "../../globals.css";

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
      <Header location={"new"}></Header>
      <main className="edit-page">
        <BookEditSection />
      </main>
      {/* <Footer></Footer> */}
    </>
  );
}
