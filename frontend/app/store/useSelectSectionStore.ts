import { create } from "zustand";

type SelectSectionState = {
  section: string;
  setSection: (value: string) => void;
};

export const useSelectSectionStore = create<SelectSectionState>((set) => ({
  section: "character",
  setSection: (value) => set(() => ({ section: value })),
}));