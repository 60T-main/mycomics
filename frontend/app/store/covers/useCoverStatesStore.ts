import { create } from "zustand";

import {CoverVersionApiFieldsGet} from "../../services/product/product-types"


type CoverStore = {
  coverList: CoverVersionApiFieldsGet | null ;
  setCoverList: (value : CoverVersionApiFieldsGet) => void;

};

export const useCoverStore = create<CoverStore>((set) => ({
  coverList: null,
  setCoverList: (value) => set(() => ({ coverList: value })),
}));