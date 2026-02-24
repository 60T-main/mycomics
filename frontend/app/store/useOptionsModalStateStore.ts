import { create } from "zustand";

type SelectOptionsModalState = {
  openCardId: string | null;
  setOpenCardId: (value: string | null) => void;
};

export const useSelectOptionsModalStore = create<SelectOptionsModalState>((set) => ({
  openCardId: null,
  setOpenCardId: (value) => set(() => ({ openCardId: value })),
}));