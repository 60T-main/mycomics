"use client";

import ImageUpload from "./image-upload";

import { FormEvent, useMemo, useState } from "react";

import { useBookStore } from "../store/books/useBookStatesStore";

type BuildMode = "single" | "detailed";
type DetailedInputMode = "text" | "image";

type DetailedPageDraft = {
  pageNumber: number;
  theme: string;
  mode: DetailedInputMode;
  prompt: string;
  dialogueHint: string;
  imageUploaded: boolean;
};

type PreparedPage = {
  pageNumber: number;
  theme: string;
  mode: DetailedInputMode;
  previewText: string;
};

const TOTAL_PAGES = 8;
const GLOBAL_MIN_WORDS = 50;
const PAGE_MIN_WORDS = 20;
const PAGE_MAX_WORDS = 90;

const PAGE_THEMES = [
  "დრამატული",
  "სათავგადასავლო",
  "რომანტიკული",
  "იუმორისტული",
  "საიდუმლო",
  "ფენტეზი",
];

const countWords = (value: string) =>
  value.trim().split(/\s+/).filter(Boolean).length;

export default function PageEditSection() {
  const { bookState } = useBookStore();

  const [buildMode, setBuildMode] = useState<BuildMode>("single");
  const [globalPrompt, setGlobalPrompt] = useState("");
  const [singleModeMessage, setSingleModeMessage] = useState<string | null>(
    null,
  );

  const [detailedDraft, setDetailedDraft] = useState<DetailedPageDraft>({
    pageNumber: 1,
    theme: "",
    mode: "text",
    prompt: "",
    dialogueHint: "",
    imageUploaded: false,
  });
  const [preparedPages, setPreparedPages] = useState<PreparedPage[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const globalWordCount = useMemo(
    () => countWords(globalPrompt),
    [globalPrompt],
  );
  const detailedPromptWordCount = useMemo(
    () => countWords(detailedDraft.prompt),
    [detailedDraft.prompt],
  );

  const sortedPreparedPages = useMemo(
    () => [...preparedPages].sort((a, b) => a.pageNumber - b.pageNumber),
    [preparedPages],
  );

  const handleSingleModeSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (globalWordCount < GLOBAL_MIN_WORDS) {
      setErrorMessage(
        `ერთიანი პრომპტი უნდა იყოს მინიმუმ ${GLOBAL_MIN_WORDS} სიტყვა.`,
      );
      setSingleModeMessage(null);
      return;
    }

    setErrorMessage(null);
    setSingleModeMessage("ყველა გვერდის გენერაციის შაბლონი მზად არის.");
  };

  const handleDetailedModeSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!detailedDraft.theme) {
      setErrorMessage("აირჩიე გვერდის თემა.");
      return;
    }

    if (detailedDraft.mode === "text") {
      if (
        detailedPromptWordCount < PAGE_MIN_WORDS ||
        detailedPromptWordCount > PAGE_MAX_WORDS
      ) {
        setErrorMessage(
          `გვერდის პრომპტი უნდა იყოს ${PAGE_MIN_WORDS}-${PAGE_MAX_WORDS} სიტყვას შორის.`,
        );
        return;
      }
    }

    if (detailedDraft.mode === "image" && !detailedDraft.imageUploaded) {
      setErrorMessage("ატვირთე ფოტო ან გადადი ტექსტურ რეჟიმზე.");
      return;
    }

    const previewText =
      detailedDraft.mode === "text"
        ? detailedDraft.prompt
        : detailedDraft.dialogueHint || "ფოტოზე დაფუძნებული გვერდი";

    const nextPage: PreparedPage = {
      pageNumber: detailedDraft.pageNumber,
      theme: detailedDraft.theme,
      mode: detailedDraft.mode,
      previewText,
    };

    setPreparedPages((prev) => {
      const exists = prev.some(
        (page) => page.pageNumber === nextPage.pageNumber,
      );
      if (exists) {
        return prev.map((page) =>
          page.pageNumber === nextPage.pageNumber ? nextPage : page,
        );
      }
      return [...prev, nextPage];
    });

    setErrorMessage(null);
  };

  const preparedCount = sortedPreparedPages.length;

  const disabledSection = <div className="w-full text-center"> DISABLED </div>;

  if (bookState && bookState?.book?.status === "DRAFT") return disabledSection;

  return (
    <section
      id="tab-cover"
      role="tabpanel"
      aria-labelledby="tab-cover-btn"
      className={`edit-section ${bookState && bookState?.book?.status === "DRAFT" && "disabled"}`}
    >
      <article className="cover-article lg:w-7/10 xl:w-6/10 mb-12">
        <h2>ნაბიჯი 4/4 • გვერდები</h2>

        <div className="w-full flex flex-col items-center justify-center gap-6 lg:gap-10 px-6 py-6 lg:py-8">
          <div className="w-full max-w-3xl rounded-2xl border-2 border-neutral-200 bg-orange-50/40 px-4 py-3">
            <p className="font-bold">
              აირჩიე შექმნის რეჟიმი: ერთიანი პრომპტი ან დეტალური გვერდობრივი
              რეჟიმი.
            </p>
          </div>

          <div className="w-full max-w-3xl flex gap-2">
            <button
              type="button"
              className={`border-2 rounded-xl px-4 py-2 ${
                buildMode === "single" ? "bg-[var(--color-primary)]" : ""
              }`}
              onClick={() => {
                setBuildMode("single");
                setErrorMessage(null);
              }}
            >
              ერთიანი პრომპტი
            </button>
            <button
              type="button"
              className={`border-2 rounded-xl px-4 py-2 ${
                buildMode === "detailed" ? "bg-[var(--color-primary)]" : ""
              }`}
              onClick={() => {
                setBuildMode("detailed");
                setErrorMessage(null);
              }}
            >
              დეტალური რეჟიმი
            </button>
          </div>

          {buildMode === "single" && (
            <form
              onSubmit={handleSingleModeSubmit}
              className="w-full max-w-3xl flex flex-col gap-4"
            >
              <label className="flex flex-col gap-2">
                <span>ერთიანი პრომპტი მთელი წიგნისთვის</span>
                <textarea
                  className="border-2 rounded-xl px-3 py-2 h-48 resize-none"
                  placeholder="აღწერე სრული ისტორია, პერსონაჟები, გარემო და ძირითადი კონფლიქტი..."
                  value={globalPrompt}
                  onChange={(event) => setGlobalPrompt(event.target.value)}
                  required
                />
              </label>

              <p className="text-xs md:text-sm text-neutral-700">
                სიტყვები: {globalWordCount} / მინიმუმ {GLOBAL_MIN_WORDS}
              </p>

              <p className="text-xs md:text-sm text-neutral-600">
                *რჩევა: აღწერე დასაწყისი, შუა ნაწილი და დასასრული ერთ პრომპტში,
                რომ ყველა გვერდი ერთიანად განვითარდეს.
              </p>

              {singleModeMessage && (
                <p className="text-green-700 text-sm">{singleModeMessage}</p>
              )}

              <button type="submit" className="border-2 rounded-2xl py-2 mt-2">
                ყველა გვერდის მომზადება
              </button>
            </form>
          )}

          {buildMode === "detailed" && (
            <form
              onSubmit={handleDetailedModeSubmit}
              className="w-full max-w-3xl flex flex-col gap-4"
            >
              <label className="flex flex-col gap-2">
                <span>1) გვერდის ნომერი</span>
                <select
                  className="border-2 rounded-xl px-3 py-2"
                  value={detailedDraft.pageNumber}
                  onChange={(event) =>
                    setDetailedDraft((prev) => ({
                      ...prev,
                      pageNumber: Number(event.target.value),
                    }))
                  }
                >
                  {Array.from({ length: TOTAL_PAGES }, (_, index) => (
                    <option key={index + 1} value={index + 1}>
                      გვერდი {index + 1}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span>2) გვერდის თემა</span>
                <select
                  className="border-2 rounded-xl px-3 py-2"
                  value={detailedDraft.theme}
                  onChange={(event) =>
                    setDetailedDraft((prev) => ({
                      ...prev,
                      theme: event.target.value,
                    }))
                  }
                  required
                >
                  <option value="" disabled>
                    აირჩიე თემა
                  </option>
                  {PAGE_THEMES.map((theme) => (
                    <option key={theme} value={theme}>
                      {theme}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex gap-2">
                <button
                  type="button"
                  className={`border-2 rounded-xl px-4 py-2 ${
                    detailedDraft.mode === "text"
                      ? "bg-[var(--color-primary)]"
                      : ""
                  }`}
                  onClick={() =>
                    setDetailedDraft((prev) => ({
                      ...prev,
                      mode: "text",
                      imageUploaded: false,
                    }))
                  }
                >
                  ტექსტური პრომპტი
                </button>
                <button
                  type="button"
                  className={`border-2 rounded-xl px-4 py-2 ${
                    detailedDraft.mode === "image"
                      ? "bg-[var(--color-primary)]"
                      : ""
                  }`}
                  onClick={() =>
                    setDetailedDraft((prev) => ({ ...prev, mode: "image" }))
                  }
                >
                  ფოტო ატვირთვა
                </button>
              </div>

              {detailedDraft.mode === "text" && (
                <>
                  <label className="flex flex-col gap-2">
                    <span>3) გვერდის პრომპტი</span>
                    <textarea
                      className="border-2 rounded-xl px-3 py-2 h-40 resize-none"
                      placeholder="აღწერე კონკრეტულად რა ხდება ამ გვერდზე..."
                      value={detailedDraft.prompt}
                      onChange={(event) =>
                        setDetailedDraft((prev) => ({
                          ...prev,
                          prompt: event.target.value,
                        }))
                      }
                      required
                    />
                  </label>
                  <p className="text-xs md:text-sm text-neutral-700">
                    სიტყვები: {detailedPromptWordCount} / მინიმუმ{" "}
                    {PAGE_MIN_WORDS}, მაქსიმუმ {PAGE_MAX_WORDS}
                  </p>
                </>
              )}

              {detailedDraft.mode === "image" && (
                <>
                  <div>
                    <p className="font-bold text-sm mb-2">3) ატვირთე ფოტო</p>
                    <ImageUpload
                      setUploaded={(value) =>
                        setDetailedDraft((prev) => ({
                          ...prev,
                          imageUploaded:
                            typeof value === "function"
                              ? value(prev.imageUploaded)
                              : value,
                        }))
                      }
                    />
                    <p className="text-xs md:text-sm text-neutral-600 mt-2">
                      *ფოტო და ტექსტური პრომპტი ერთდროულად არ გამოიყენება.
                      ატვირთე სურათი და ქვემოთ მიუთითე დიალოგის ტექსტი
                      სურვილისამებრ.
                    </p>
                  </div>

                  <label className="flex flex-col gap-2">
                    <span>დიალოგის ტექსტი (არასავალდებულო)</span>
                    <textarea
                      className="border-2 rounded-xl px-3 py-2 h-28 resize-none"
                      placeholder="მაგ: გმირი ამბობს: ჩვენ ამას შევძლებთ!"
                      value={detailedDraft.dialogueHint}
                      onChange={(event) =>
                        setDetailedDraft((prev) => ({
                          ...prev,
                          dialogueHint: event.target.value,
                        }))
                      }
                    />
                  </label>
                </>
              )}

              <button type="submit" className="border-2 rounded-2xl py-2 mt-2">
                გვერდის შენახვა
              </button>
            </form>
          )}

          {errorMessage && (
            <p className="w-full max-w-3xl text-red-500 text-sm">
              {errorMessage}
            </p>
          )}

          <div className="w-full max-w-3xl rounded-2xl border-2 border-neutral-200 bg-white px-4 py-4">
            <p className="font-bold mb-2">
              მომზადებული გვერდები ({preparedCount}/{TOTAL_PAGES})
            </p>

            {sortedPreparedPages.length === 0 ? (
              <p className="text-xs md:text-sm text-neutral-500">
                ჯერ არცერთი გვერდი არ არის მომზადებული.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {sortedPreparedPages.map((page) => (
                  <div
                    key={page.pageNumber}
                    className="border-2 rounded-xl px-3 py-2 bg-neutral-50"
                  >
                    <p className="font-bold text-sm">
                      გვერდი {page.pageNumber} • {page.theme} •{" "}
                      {page.mode === "text" ? "ტექსტი" : "ფოტო"}
                    </p>
                    <p className="text-xs md:text-sm text-neutral-700 truncate">
                      {page.previewText}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            className="w-full max-w-3xl border-2 rounded-2xl py-3 mt-2 opacity-50 cursor-not-allowed"
            disabled
            aria-disabled="true"
          >
            წიგნის დასრულება
          </button>
        </div>
      </article>
    </section>
  );
}
