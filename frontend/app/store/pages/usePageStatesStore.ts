import { create } from "zustand";

import {PageApiFieldsGet} from "../../services/product/product-types"


type PageStore = {
  pageList: PageApiFieldsGet[];
  setPageList: (value : PageApiFieldsGet[]) => void;

};

export const usePageStore = create<PageStore>((set) => ({
  pageList: [],
  setPageList: (value) => set(() => ({ pageList: value })),
}));