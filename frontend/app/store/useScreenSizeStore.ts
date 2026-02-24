'use client';

import { useEffect } from "react";
import { create } from "zustand";

type ScreenSizeState = {
  width: number;
  height: number;
  isSmUp: boolean;
  isMdUp: boolean;
  isLgUp: boolean;
  isXlUp: boolean;
  is2xlUp: boolean;
  setSize: (width: number, height: number) => void;
};

const SM_MIN_WIDTH = 640;
const MD_MIN_WIDTH = 768;
const LG_MIN_WIDTH = 1024;
const XL_MIN_WIDTH = 1280;
const XXL_MIN_WIDTH = 1536;

export const useScreenSizeStore = create<ScreenSizeState>((set) => ({
  width: 0,
  height: 0,
  isSmUp: false,
  isMdUp: false,
  isLgUp: false,
  isXlUp: false,
  is2xlUp: false,
  setSize: (width, height) =>
    set(() => ({
      width,
      height,
      isSmUp: width >= SM_MIN_WIDTH,
      isMdUp: width >= MD_MIN_WIDTH,
      isLgUp: width >= LG_MIN_WIDTH,
      isXlUp: width >= XL_MIN_WIDTH,
      is2xlUp: width >= XXL_MIN_WIDTH,
    })),
}));

export const useScreenSizeListener = () => {
  const setSize = useScreenSizeStore((state) => state.setSize);

  useEffect(() => {
    const update = () => setSize(window.innerWidth, window.innerHeight);
    update();

    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [setSize]);
};
