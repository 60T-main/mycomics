import { create } from "zustand";

import {CharacterApiFieldsGet} from "../../services/product/product-types"


type CharacterStore = {
  characterList: CharacterApiFieldsGet | null ;
  setCharacterList: (value : CharacterApiFieldsGet) => void;

};

export const useCharacterStore = create<CharacterStore>((set) => ({
  characterList: null,
  setCharacterList: (value) => set(() => ({ characterList: value })),
}));