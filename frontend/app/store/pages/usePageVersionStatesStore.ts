import { create } from "zustand";

import {PageVersionApiFieldsGet} from "../../services/product/product-types"


type PageVersionStore = {
  pageVersionList: PageVersionApiFieldsGet | null ;
  setPageVersionList: (value : PageVersionApiFieldsGet) => void;

};

export const usePageVersionStore = create<PageVersionStore>((set) => ({
  pageVersionList: null,
  setPageVersionList: (value) => set(() => ({ pageVersionList: value })),
}));