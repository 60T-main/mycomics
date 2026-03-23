"use client";

import ImageUpload from "./image-upload";
import ConfirmationModal from "./confirmation-modal";
import ImageLightboxModal from "./image-lightbox-modal";
import fetchProducts from "../services/product/product-api";

import { useCharacterStore } from "../store/characters/useCharacterStatesStore";
import { useBookStore } from "../store/books/useBookStatesStore";
import { CharacterApiFieldsGet } from "../services/product/product-types";

import { useSelectSectionStore } from "../store/useSelectSectionStore";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
const FREE_TIER_CHARACTER_LIMIT = 3;
const PAID_TIER_CHARACTER_LIMIT = 5;

const getBackendOrigin = () => {
  if (!API_BASE) {
    return "";
  }
  return API_BASE.endsWith("/api") ? API_BASE.slice(0, -4) : API_BASE;
};

const resolveImageUrl = (value: string | null) => {
  if (!value) {
    return "/supergirl.png";
  }
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  if (value.startsWith("/")) {
    return `${getBackendOrigin()}${value}`;
  }
  return `${getBackendOrigin()}/${value}`;
};

const getCharacterPreviewList = (character: CharacterApiFieldsGet) => {
  const photos =
    character.reference_photos && character.reference_photos.length > 0
      ? character.reference_photos
      : character.reference_photo
        ? [character.reference_photo]
        : [];

  if (photos.length === 0) {
    return ["/supergirl.png"];
  }

  return photos.slice(0, 3).map((photo) => resolveImageUrl(photo));
};

export default function CharacterEditSection() {
  const [uploaded, setUploaded] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (uploaded) {
      setErrorMessage(null);
    }
  }, [uploaded]);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { characterList, setCharacterList } = useCharacterStore();
  const { bookState } = useBookStore();
  const bookId = bookState?.book?.id ?? null;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isCharactersOpen, setIsCharactersOpen] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<CharacterApiFieldsGet | null>(null);
  const [characterLimit, setCharacterLimit] = useState(
    FREE_TIER_CHARACTER_LIMIT,
  );
  const isFreeTierLimit = characterLimit === FREE_TIER_CHARACTER_LIMIT;
  const isCharacterLimitReached = characterList.length >= characterLimit;
  const charactersDetailsRef = useRef<HTMLDetailsElement | null>(null);
  const hasInitializedCharactersRef = useRef(false);
  const previousCharactersCountRef = useRef(0);

  const { setSection } = useSelectSectionStore();

  useEffect(() => {
    if (!hasInitializedCharactersRef.current) {
      previousCharactersCountRef.current = characterList.length;
      hasInitializedCharactersRef.current = true;
      return;
    }

    if (characterList.length > previousCharactersCountRef.current) {
      setIsCharactersOpen(true);
      requestAnimationFrame(() => {
        charactersDetailsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }

    previousCharactersCountRef.current = characterList.length;
  }, [characterList.length]);

  const loadCharacters = useCallback(async () => {
    if (!API_BASE || !bookId) {
      return;
    }

    try {
      const data = await fetchProducts({
        method: "GET",
        id: null,
        bodyData: null,
        product: "characters",
        queryParams: { book_id: bookId },
      });

      if (!data) {
        throw new Error("Failed to fetch characters");
      }

      setCharacterList(data);
    } catch {
      setErrorMessage("პერსონაჟების ჩამოტვირთვა ვერ მოხერხდა");
    }
  }, [bookId, setCharacterList]);

  useEffect(() => {
    loadCharacters();
  }, [loadCharacters]);

  const loadCharacterLimit = useCallback(async () => {
    if (!API_BASE || !bookId) {
      setCharacterLimit(FREE_TIER_CHARACTER_LIMIT);
      return;
    }

    try {
      const bookData = await fetchProducts({
        method: "GET",
        id: bookId,
        bodyData: null,
        product: "books",
      });

      setCharacterLimit(
        bookData?.pricing_tier
          ? PAID_TIER_CHARACTER_LIMIT
          : FREE_TIER_CHARACTER_LIMIT,
      );
    } catch {
      setCharacterLimit(FREE_TIER_CHARACTER_LIMIT);
    }
  }, [bookId]);

  useEffect(() => {
    loadCharacterLimit();
  }, [loadCharacterLimit]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!API_BASE) {
      setErrorMessage("API მისამართი არ არის კონფიგურირებული");
      return;
    }
    if (!bookId) {
      setErrorMessage("ჯერ შექმენი წიგნი");
      return;
    }
    if (isCharacterLimitReached) {
      setErrorMessage(
        isFreeTierLimit
          ? "ამ ეტაპზე უფასო გეგმაში 3 პერსონაჟამდე დამატებაა შესაძლებელი. თუ მეტი გინდა, ფასიანი ტარიფით 5-მდე შეძლებ."
          : `ამ წიგნში პერსონაჟების ლიმიტი მიღწეულია (${characterLimit}).`,
      );
      return;
    }
    if (!uploaded) {
      setErrorMessage("ჯერ ატვირთე ფოტო");
      return;
    }
    if (selectedFiles.length === 0) {
      setErrorMessage("აირჩიე მინიმუმ ერთი ფოტო");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const Name = String(formData.get("characterName") ?? "").trim();
    const Gender = String(formData.get("characterGender") ?? "").trim();

    if (!Name || !Gender) {
      setErrorMessage("შეავსე ყველა აუცილებელი ველი");
      return;
    }

    const payload = new FormData();
    payload.append("book_id", bookId);
    payload.append("name", Name);
    payload.append("gender", Gender);
    payload.append("reference_photo", selectedFiles[0]);
    selectedFiles.forEach((file) => {
      payload.append("reference_photos", file);
    });

    setIsSubmitting(true);
    try {
      const created = await fetchProducts({
        method: "POST",
        id: null,
        bodyData: payload,
        product: "characters",
      });

      if (!created) {
        throw new Error("Failed to create character");
      }

      setCharacterList([...characterList, created]);
      setPreviews([]);

      form.reset();
      setSelectedFiles([]);
      setErrorMessage(null);
    } catch {
      setErrorMessage("პერსონაჟის დამატება ვერ მოხერხდა");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditName = (character: CharacterApiFieldsGet) => {
    setEditingId(character.id);
    setEditingName(character.name);
  };

  const cancelEditName = () => {
    setEditingId(null);
    setEditingName("");
  };

  const saveEditName = async (character: CharacterApiFieldsGet) => {
    if (!API_BASE) {
      setErrorMessage("API მისამართი არ არის კონფიგურირებული");
      return;
    }

    const nextName = editingName.trim();
    if (!nextName) {
      return;
    }

    try {
      const updated = await fetchProducts({
        method: "PATCH",
        id: character.id,
        bodyData: { name: nextName },
        product: "characters",
      });

      if (!updated) {
        throw new Error("Failed to update character");
      }

      setCharacterList(
        characterList.map((item) => (item.id === updated.id ? updated : item)),
      );
      cancelEditName();
    } catch {
      setErrorMessage("სახელის განახლება ვერ მოხერხდა");
    }
  };

  const deleteCharacter = async (characterId: string) => {
    if (!API_BASE) {
      setErrorMessage("API მისამართი არ არის კონფიგურირებული");
      return;
    }

    try {
      const removed = await fetchProducts({
        method: "DELETE",
        id: characterId,
        bodyData: null,
        product: "characters",
      });

      if (removed === null) {
        throw new Error("Failed to delete character");
      }

      setCharacterList(characterList.filter((item) => item.id !== characterId));
    } catch {
      setErrorMessage("პერსონაჟის წაშლა ვერ მოხერხდა");
    }

    if (editingId === characterId) {
      cancelEditName();
    }
  };

  const requestDeleteCharacter = (character: CharacterApiFieldsGet) => {
    setDeleteTarget(character);
  };

  const closeDeleteModal = () => {
    setDeleteTarget(null);
  };

  const confirmDeleteCharacter = async () => {
    if (!deleteTarget) {
      return;
    }
    await deleteCharacter(deleteTarget.id);
    closeDeleteModal();
  };

  return (
    <section
      id="tab-characters"
      role="tabpanel"
      aria-labelledby="tab-characters-btn"
      className="edit-section"
    >
      <ConfirmationModal
        isOpen={Boolean(deleteTarget)}
        title="პერსონაჟის წაშლა"
        message={`დარწმუნებული ხართ რომ პერსონაჟის წაშლა გსურთ?`}
        confirmLabel="წაშლა"
        cancelLabel="დაბრუნება"
        onConfirm={confirmDeleteCharacter}
        onCancel={closeDeleteModal}
      />
      <ImageLightboxModal
        isOpen={Boolean(expandedImage)}
        imageSrc={expandedImage}
        imageAlt="პერსონაჟის ფოტო"
        onClose={() => setExpandedImage(null)}
      />
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
            <ImageUpload
              setUploaded={setUploaded}
              onFilesChange={setSelectedFiles}
              previews={previews}
              setPreviews={setPreviews}
            ></ImageUpload>

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
              disabled={!uploaded || isSubmitting || isCharacterLimitReached}
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
                  <option value="male">მამრობითი</option>
                  <option value="female">მდედრობითი</option>
                </select>
              </label>

              <button type="submit" className="border-2 rounded-2xl py-2 mt-2">
                {isSubmitting ? "იტვირთება..." : "დამატება"}
              </button>
            </fieldset>
            {isCharacterLimitReached && (
              <div className="rounded-xl border-2 border-orange-200 bg-orange-50 px-3 py-2">
                <p className="text-xs md:text-sm text-neutral-700">
                  {isFreeTierLimit ? (
                    <>
                      <b>პერსონაჟების ლიმიტი მიღწეულია (3/3).</b> წიგნის ყიდვის
                      შემდეგ 5 პერსონაჟის დამატებას შეძლებ.
                    </>
                  ) : (
                    `ლიმიტი მიღწეულია: მაქსიმუმ ${characterLimit} პერსონაჟი.`
                  )}
                </p>
                {isFreeTierLimit && (
                  <div className="mt-2 flex items-center gap-2">
                    {/* TODO: Connect this CTA to checkout/pricing flow when purchase UX is finalized. */}
                    <button
                      type="button"
                      className="border-2 rounded-xl px-3 py-1 text-xs md:text-sm bg-white"
                      aria-disabled="true"
                    >
                      შეიძინე წიგნი
                    </button>
                    <p className="text-[11px] md:text-xs text-neutral-500">
                      დროებით არააქტიურია, მალე დავაკავშირებთ.
                    </p>
                  </div>
                )}
              </div>
            )}
          </form>

          <details
            ref={charactersDetailsRef}
            open={isCharactersOpen}
            onToggle={(event) => {
              setIsCharactersOpen(event.currentTarget.open);
            }}
            className="w-full max-w-3xl rounded-2xl border-2 border-neutral-200 bg-white px-4 py-3 scroll-mt-20"
          >
            <summary className="cursor-pointer select-none font-bold">
              ჩემი პერსონაჟები ({characterList.length})
            </summary>
            <p className="text-neutral-700 text-xs md:text-sm mt-1 mb-3">
              აქ შეგიძლია სახელის შეცვლა ან წაშლა.
            </p>

            {characterList.length === 0 && (
              <p className="text-xs md:text-sm text-neutral-500">
                ჯერ პერსონაჟი არ გაქვს დამატებული.
              </p>
            )}

            {characterList.length > 0 && (
              <>
                <div className="mt-2 flex flex-col gap-3">
                  {characterList.map((character) => (
                    <div
                      key={character.id}
                      className="flex flex-col lg:flex-row items-center gap-3 rounded-xl border-2 border-neutral-200 p-3"
                    >
                      <div className="flex items-center gap-1">
                        {getCharacterPreviewList(character).map(
                          (photoUrl, index) => (
                            <img
                              key={`${character.id}-${index}`}
                              src={photoUrl}
                              alt={`${character.name} reference ${index + 1}`}
                              className="h-60 w-50 rounded-lg object-cover border-2 cursor-zoom-in"
                              onClick={() => setExpandedImage(photoUrl)}
                            />
                          ),
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        {editingId === character.id ? (
                          <div className="flex flex-col items-center gap-2">
                            <input
                              value={editingName}
                              onChange={(event) =>
                                setEditingName(event.target.value)
                              }
                              className="border-2 rounded-lg px-2 py-1 w-full"
                              maxLength={80}
                            />
                            <div className="flex gap-4">
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
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <p className="font-bold truncate">
                              {character.name}
                            </p>
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
                            onClick={() => requestDeleteCharacter(character)}
                            className="border-2 rounded-lg px-2 py-1 text-xs md:text-sm text-red-600"
                          >
                            წაშლა
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setSection("cover");
                  }}
                  className="border-2 rounded-2xl py-2 mt-2 w-full hover:bg-[var(--color-primary)] transition-all duration-200"
                >
                  {isSubmitting ? "იტვირთება..." : "გაგრძელება"}
                </button>
              </>
            )}
          </details>
        </div>
      </article>
    </section>
  );
}
