'use client'

import { create } from "zustand";

import { useEffect, useRef } from "react";

import { useSelectOptionsModalStore } from "./useOptionsModalStateStore";

type DropdownTriggerType = {
  DropdownTrigger: (value: string | null) => void;
};

export const useDropdownOutsideClick = () => {
  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const setOpenCardId = useSelectOptionsModalStore(
    (state) => state.setOpenCardId,
  );

  useEffect(() => {
    const close = (e: MouseEvent) => {
      const target = e.target as Node | null;
      const isClickInsideCard = target
        ? Object.values(cardRefs.current).some(
            (cardRef) => cardRef && cardRef.contains(target),
          )
        : false;
      if (!isClickInsideCard) {
        setOpenCardId(null);
      }
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [setOpenCardId]);

  return { cardRefs };
};

export const useDropdownTriggerStore = create<DropdownTriggerType>(() => ({
  DropdownTrigger: (value) => {
    const { openCardId, setOpenCardId } = useSelectOptionsModalStore.getState();
    setOpenCardId(openCardId === value ? null : value);
  },
}));