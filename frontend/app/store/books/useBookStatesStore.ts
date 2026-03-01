import { create } from "zustand";

import {BookApiFieldsGet} from "../../services/product/product-types"


type BookStore = {
  bookList: BookApiFieldsGet | null ;
  setBookList: (value : BookApiFieldsGet) => void;

};

export const useBookStore = create<BookStore>((set) => ({
  bookList: null,
  setBookList: (value) => set(() => ({ bookList: value })),
}));