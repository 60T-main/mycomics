import { create } from "zustand";

export type ApiErrorKey = string | "bookApi" | "characterApi" | "characterVersionsApi" | "coverVersionsApi" | "pagesApi" | "pagesVersionsApi" | "retryPackApi";

type ErrorStore = {
  errors: Record<ApiErrorKey, string | null>;
  setError: (key: ApiErrorKey, value: string | null) => void;
  clearError: (key: ApiErrorKey) => void;
  clearAllErrors: () => void;
};

export const useErrorStore = create<ErrorStore>((set) => ({
  errors: {
    bookApi: null,
    characterApi: null,
    characterVersionsApi: null,
    coverVersionsApi: null,
    pagesApi: null,
    pagesVersionsApi: null,
    retryPackApi: null,
  },
  setError: (key, value) =>
    set((state) => ({
      errors: {
        ...state.errors,
        [key]: value,
      },
    })),
  clearError: (key) =>
    set((state) => ({
      errors: {
        ...state.errors,
        [key]: null,
      },
    })),
  clearAllErrors: () =>
    set(() => ({
      errors: {
        bookApi: null,
        characterApi: null,
        characterVersionsApi: null,
        coverVersionsApi: null,
        pagesApi: null,
        pagesVersionsApi: null,
        retryPackApi: null,
      },
    })),
}));