import { create } from "zustand";

import {BookApiFieldsGet, BookInitApiFieldsGet} from "../../services/product/product-types"


type BookStore = {
  bookList: BookApiFieldsGet | null ;
  setBookList: (value: BookApiFieldsGet) => void;
  bookState: BookInitApiFieldsGet | null ;
  setBookState: (value: BookInitApiFieldsGet) => void;

};

export const useBookStore = create<BookStore>((set) => ({
  bookList: null,
  bookState: null,
  setBookList: (value) => set(() => ({ bookList: value })),
  setBookState: (value) => set(() => ({ bookState: value })),
}));