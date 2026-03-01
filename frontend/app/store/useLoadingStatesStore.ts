import { create } from "zustand";

export type ApiLoadingKey = string | "bookApi" | "characterApi" | "characterVersionsApi" | "coverVersionsApi" | "pagesApi" | "pagesVersionsApi" | "retryPackApi";

type LoadingStore = {
  loadings: Record<ApiLoadingKey, boolean>;
  setLoading: (key: ApiLoadingKey, value: boolean) => void;
  clearLoading: (key: ApiLoadingKey) => void;
  clearAllLoading: () => void;
};

export const useLoadingStore = create<LoadingStore>((set) => ({
  loadings: {
    bookApi: false,
    characterApi: false,
    characterVersionsApi: false,
    coverVersionsApi: false,
    pagesApi: false,
    pagesVersionsApi: false,
    retryPackApi: false,
  },
  setLoading: (key, value) =>
    set((state) => ({
      loadings: {
        ...state.loadings,
        [key]: value,
      },
    })),
  clearLoading: (key) =>
    set((state) => ({
      loadings: {
        ...state.loadings,
        [key]: false,
      },
    })),
  clearAllLoading: () =>
    set(() => ({
      loadings: {
        bookApi: false,
        characterApi: false,
        characterVersionsApi: false,
        coverVersionsApi: false,
        pagesApi: false,
        pagesVersionsApi: false,
        retryPackApi: false,
      },
    })),
}));