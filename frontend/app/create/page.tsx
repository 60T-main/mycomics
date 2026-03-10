"use client";

import Header from "../components/header";
import Footer from "../components/footer";
import CharacterEditSection from "../components/character-edit-section";
import CoverEditSection from "../components/cover-edit-section";
import PageEditSection from "../components/page-edit-section";

import { useSelectSectionStore } from "../store/useSelectSectionStore";

import { useSelectModalStore } from "../store/useModalStateStore";

import { useBookStore } from "../store/books/useBookStatesStore";

import { useLoadingStore } from "../store/useLoadingStatesStore";
import { useErrorStore } from "../store/useErrorStatesStore";

import Maintenance from "../components/maintenance";

import fetchInitCreate from "../services/product/init-create-api";

import {
  useScreenSizeListener,
  useScreenSizeStore,
} from "@/app/store/useScreenSizeStore";

import "../globals.css";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function CreatePage() {
  const router = useRouter();
  useScreenSizeListener();
  const { section, setSection } = useSelectSectionStore();
  const { isLgUp } = useScreenSizeStore();

  const { bookState, setBookState } = useBookStore();

  const { loadings } = useLoadingStore();
  const [isInitResolved, setIsInitResolved] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const { setLoading, clearLoading } = useLoadingStore.getState();
  const { errors } = useErrorStore.getState();

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

  // Call GET /init-create on initial load to check if user has active books
  useEffect(() => {
    let isMounted = true;

    const checkBookInit = async () => {
      try {
        const response = await fetchInitCreate();

        if (!isMounted || !response) {
          return;
        }

        console.log(response.action);

        if (response.action === "needs_style") {
          setIsRedirecting(true);
          router.replace("/create/new");
          return;
        }

        setBookState(response);
      } finally {
        if (isMounted) {
          setIsInitResolved(true);
        }
      }
    };

    checkBookInit();

    return () => {
      isMounted = false;
    };
  }, [router, setBookState]);

  useEffect(() => {
    if (open && !isLgUp) {
      document.body.classList.add("overflow-y-hidden");
    } else if (!open && !isLgUp) {
      document.body.classList.remove("overflow-y-hidden");
    }
  }, [open, isLgUp]);

  return (
    <>
      {!isInitResolved || loadings.initCreateApi || isRedirecting ? (
        <>
          <Header location={"home"}></Header>
          <div>LOADING...</div>
        </>
      ) : !errors.initCreateApi ? (
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
      ) : (
        <div className="flex flex-col items center justify-center mt-25">
          <Maintenance />
          <div className="inline-font mt-10 text-center">
            მიმდინარეობს განახლების პროცესი. <br></br>
            <br></br>მალე დაგიბრუნდებით ახალი ფუნქციებით და უკეთესი
            მომსახურებით.
          </div>
        </div>
      )}
    </>
  );
}
