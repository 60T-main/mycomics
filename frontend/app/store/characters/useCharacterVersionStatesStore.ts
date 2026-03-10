import { create } from "zustand";

import {CharacterVersionApiFieldsGet} from "../../services/product/product-types"


type CharacterVersionStore = {
  characterVersionList: CharacterVersionApiFieldsGet | null ;
  setCharacterVersionList: (value : CharacterVersionApiFieldsGet) => void;

};

export const useCharacterVersionStore = create<CharacterVersionStore>((set) => ({
  characterVersionList: null,
  setCharacterVersionList: (value) => set(() => ({ characterVersionList: value })),
}));