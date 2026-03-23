import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type SelectSectionState = {
  section: string;
  setSection: (value: string) => void;
};

export const useSelectSectionStore = create<SelectSectionState>()(
  persist(
    (set) => ({
      section: "character",
      setSection: (value) => set(() => ({ section: value })),
    }),
    {
      name: "create-selected-section",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ section: state.section }),
    },
  ),
);