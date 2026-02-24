import { create } from "zustand";


type SelectModalState = {
  open: boolean;
  setOpen: (value: boolean) => void;
};

export const useSelectModalStore = create<SelectModalState>((set) => ({
  open: false,
  setOpen: (value) => set(() => ({ open: value })),
}));