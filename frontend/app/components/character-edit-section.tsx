"use client";

import ImageUpload from "./image-upload";

import { FormEvent, useEffect, useRef, useState } from "react";

type CharacterItem = {
  id: string;
  name: string;
  gender: string;
  reference_photo: string | null;
  isAdded: boolean;
};

export default function CharacterEditSection() {
  const [uploaded, setUploaded] = useState(false);

  useEffect(() => {
    uploaded && setErrorMessage(null);
  }, [uploaded]);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [characters, setCharacters] = useState<CharacterItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isCharactersOpen, setIsCharactersOpen] = useState(false);
  const charactersDetailsRef = useRef<HTMLDetailsElement | null>(null);
  const hasInitializedCharactersRef = useRef(false);
  const previousCharactersCountRef = useRef(0);

  useEffect(() => {
    if (!hasInitializedCharactersRef.current) {
      previousCharactersCountRef.current = characters.length;
      hasInitializedCharactersRef.current = true;
      return;
    }

    if (characters.length > previousCharactersCountRef.current) {
      setIsCharactersOpen(true);
      requestAnimationFrame(() => {
        charactersDetailsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }

    previousCharactersCountRef.current = characters.length;
  }, [characters.length]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!uploaded) {
      setErrorMessage("ჯერ ატვირთე ფოტო");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const nextName = String(formData.get("characterName") ?? "").trim();
    const nextGender = String(formData.get("characterGender") ?? "").trim();

    if (!nextName || !nextGender) {
      setErrorMessage("შეავსე ყველა აუცილებელი ველი");
      return;
    }

    setCharacters((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: nextName,
        gender: nextGender,
        reference_photo: null,
        isAdded: true,
      },
    ]);

    form.reset();
    setErrorMessage(null);
  };

  const startEditName = (character: CharacterItem) => {
    setEditingId(character.id);
    setEditingName(character.name);
  };

  const cancelEditName = () => {
    setEditingId(null);
    setEditingName("");
  };

  const saveEditName = async (character: CharacterItem) => {
    const nextName = editingName.trim();
    if (!nextName) {
      return;
    }

    setCharacters((prev) =>
      prev.map((item) =>
        item.id === character.id ? { ...item, name: nextName } : item,
      ),
    );
    cancelEditName();
  };

  const deleteCharacter = (characterId: string) => {
    setCharacters((prev) => prev.filter((item) => item.id !== characterId));
    if (editingId === characterId) {
      cancelEditName();
    }
  };

  return (
    <section
      id="tab-characters"
      role="tabpanel"
      aria-labelledby="tab-characters-btn"
      className="edit-section"
    >
      <article className="character-article lg:w-7/10 xl:w-6/10 mb-12">
        <h2>ნაბიჯი 2/4 • პერსონაჟის დამატება</h2>

        <div className="w-full flex flex-col items-center justify-center gap-6 lg:gap-10 px-6 py-6 lg:py-8">
          <div className="w-full max-w-3xl rounded-2xl border-2 border-neutral-200 bg-orange-50/40 px-4 py-3">
            <p className="font-bold">
              ატვირთე პერსონაჟის ფოტო და შეავსე მარტივი ინფორმაცია.
            </p>
          </div>

          <div className="w-full flex flex-col items-center">
            <div className="w-full max-w-3xl mb-2 md:mb-6 text-left">
              <p className="font-bold">1) ატვირთე ფოტო</p>
              <p className="text-neutral-700 text-xs md:text-sm">
                ატვირთე 1-3 ფოტო, სადაც სახე მკაფიოდ ჩანს.
              </p>
            </div>
            <ImageUpload setUploaded={setUploaded}></ImageUpload>

            <div className="w-full max-w-3xl mt-2 min-h-6">
              {uploaded ? (
                <p className="text-xs md:text-sm text-green-700">
                  ფოტო მზადაა. ახლა შეავსე ინფორმაცია ქვემოთ.
                </p>
              ) : (
                <p className="text-xs md:text-sm text-neutral-500">
                  ჯერ ფოტო არ აგიტვირთავს.
                </p>
              )}
            </div>

            <div className="hint-div">
              <p>
                <b>*რჩევა:</b> <br />
                საუკეთესო შედეგისთვის გამოიყენე ფოტო, სადაც სახე მკაფიოდ ჩანს.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="w-full max-w-3xl flex flex-col gap-4"
          >
            {errorMessage && <p className="text-red-500">{errorMessage}</p>}

            <fieldset
              disabled={!uploaded}
              className="w-full flex flex-col gap-4 disabled:opacity-50"
            >
              <label className="flex flex-col gap-2">
                <span>2) პერსონაჟის სახელი</span>
                <input
                  type="text"
                  name="characterName"
                  className="border-2 rounded-xl px-3 py-2"
                  placeholder="მაგ: ანა"
                  required
                />
              </label>

              <label className="flex flex-col gap-2">
                <span>3) სქესი</span>
                <select
                  name="characterGender"
                  className="border-2 rounded-xl px-3 py-2"
                  defaultValue=""
                  required
                >
                  <option value="" disabled>
                    აირჩიე სქესი
                  </option>
                  <option value="casual">მდედრობითი</option>
                  <option value="formal">მამრობითი</option>
                </select>
              </label>

              <button type="submit" className="border-2 rounded-2xl py-2 mt-2">
                დამატება და გაგრძელება
              </button>
            </fieldset>
          </form>

          <details
            ref={charactersDetailsRef}
            open={isCharactersOpen}
            onToggle={(event) => {
              setIsCharactersOpen(event.currentTarget.open);
            }}
            className="w-full max-w-3xl rounded-2xl border-2 border-neutral-200 bg-white px-4 py-3"
          >
            <summary className="cursor-pointer select-none font-bold">
              ჩემი პერსონაჟები ({characters.length})
            </summary>
            <p className="text-neutral-700 text-xs md:text-sm mt-1 mb-3">
              აქ შეგიძლია სახელის შეცვლა ან წაშლა.
            </p>

            {characters.length === 0 && (
              <p className="text-xs md:text-sm text-neutral-500">
                ჯერ პერსონაჟი არ გაქვს დამატებული.
              </p>
            )}

            {characters.length > 0 && (
              <div className="mt-2 flex flex-col gap-3">
                {characters.map((character) => (
                  <div
                    key={character.id}
                    className="flex items-center gap-3 rounded-xl border-2 border-neutral-200 p-3"
                  >
                    <img
                      src={character.reference_photo || "/supergirl.png"}
                      alt={character.name}
                      className="h-14 w-14 rounded-lg object-cover border-2"
                    />

                    <div className="flex-1 min-w-0">
                      {editingId === character.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            value={editingName}
                            onChange={(event) =>
                              setEditingName(event.target.value)
                            }
                            className="border-2 rounded-lg px-2 py-1 w-full"
                            maxLength={80}
                          />
                          <button
                            type="button"
                            onClick={() => saveEditName(character)}
                            className="border-2 rounded-lg px-2 py-1"
                          >
                            შენახვა
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditName}
                            className="border-2 rounded-lg px-2 py-1"
                          >
                            გაუქმება
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className="font-bold truncate">{character.name}</p>
                          <span className="text-[10px] md:text-xs px-2 py-0.5 border rounded-full text-neutral-700">
                            {character.isAdded ? "დამატებულია" : "დრაფტი"}
                          </span>
                        </div>
                      )}
                    </div>

                    {editingId !== character.id && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => startEditName(character)}
                          className="border-2 rounded-lg px-2 py-1 text-xs md:text-sm"
                        >
                          სახელის შეცვლა
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCharacter(character.id)}
                          className="border-2 rounded-lg px-2 py-1 text-xs md:text-sm text-red-600"
                        >
                          წაშლა
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </details>
        </div>
      </article>
    </section>
  );
}
