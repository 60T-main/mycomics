"use client";

import fetchProducts from "../services/product/product-api";
import { CoverVersionApiFieldsGet } from "../services/product/product-types";
import ImageLightboxModal from "./image-lightbox-modal";

import { useBookStore } from "../store/books/useBookStatesStore";
import { useCharacterStore } from "../store/characters/useCharacterStatesStore";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

type CoverFormState = {
  template: string;
  title: string;
  subtitle: string;
  author: string;
};

const COVER_TEMPLATES = [
  { value: "heroic", label: "გმირული", image: "/style-normal.jpeg" },
  { value: "fun", label: "სახალისო", image: "/style-drawn.jpeg" },
  { value: "romantic", label: "რომანტიკული", image: "/style-classic.jpeg" },
  { value: "dramatic", label: "დრამატული", image: "/style-dramatic.jpeg" },
];

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

const getBackendOrigin = () => {
  if (!API_BASE) {
    return "";
  }
  return API_BASE.endsWith("/api") ? API_BASE.slice(0, -4) : API_BASE;
};

const resolveImageUrl = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  if (value.startsWith("/")) {
    return `${getBackendOrigin()}${value}`;
  }
  return `${getBackendOrigin()}/${value}`;
};

const pickLatestCover = (covers: CoverVersionApiFieldsGet[]) => {
  return [...covers].sort((a, b) => {
    const aVersion = a.version_number ?? 0;
    const bVersion = b.version_number ?? 0;
    if (aVersion !== bVersion) {
      return bVersion - aVersion;
    }
    const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bDate - aDate;
  })[0];
};

const getCharacterReferencesForPrompt = (
  characterList: {
    id: string;
    name: string;
    reference_photo: string | null;
    reference_photos?: string[];
  }[],
) => {
  return characterList.map((character) => ({
    id: character.id,
    name: character.name,
    reference_photos:
      character.reference_photos && character.reference_photos.length > 0
        ? character.reference_photos
        : character.reference_photo
          ? [character.reference_photo]
          : [],
  }));
};

export default function CoverEditSection() {
  const [formData, setFormData] = useState<CoverFormState>({
    template: "",
    title: "",
    subtitle: "",
    author: "",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generatedCoverImage, setGeneratedCoverImage] = useState<string | null>(
    null,
  );
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const previousGeneratedCoverImageRef = useRef<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const { bookState } = useBookStore();
  const { characterList } = useCharacterStore();
  const bookId = bookState?.book?.id ?? null;

  useEffect(() => {
    if (!bookState?.book?.title) {
      return;
    }
    setFormData((prev) => {
      if (prev.title.trim()) {
        return prev;
      }
      return {
        ...prev,
        title: bookState.book?.title ?? "",
      };
    });
  }, [bookState?.book?.title]);

  const loadExistingCover = useCallback(async () => {
    if (!bookId || !API_BASE) {
      return;
    }

    try {
      const data = await fetchProducts({
        method: "GET",
        id: null,
        bodyData: null,
        product: "cover",
        queryParams: { book_id: bookId },
      });

      if (!Array.isArray(data)) {
        return;
      }

      const coversForBook = (data as CoverVersionApiFieldsGet[]).filter(
        (item) => {
          const coverBookId = item.book_id ?? (item as { book?: string }).book;
          return String(coverBookId) === String(bookId);
        },
      );

      if (coversForBook.length === 0) {
        return;
      }

      const latestCover = pickLatestCover(coversForBook);

      setFormData((prev) => ({
        ...prev,
        title: prev.title || latestCover.title_text || "",
        subtitle: latestCover.subtitle_text || "",
        author: latestCover.author_name || "",
      }));

      const previewImage = latestCover.thumbnail || latestCover.generated_image;
      if (previewImage) {
        const resolved = resolveImageUrl(previewImage);
        if (resolved) {
          setGeneratedCoverImage(resolved);
        }
      }
    } catch {
      // Keep UI usable even if existing cover fetch fails.
    }
  }, [bookId]);

  useEffect(() => {
    loadExistingCover();
  }, [loadExistingCover]);

  useEffect(() => {
    if (
      generatedCoverImage &&
      generatedCoverImage !== previousGeneratedCoverImageRef.current
    ) {
      requestAnimationFrame(() => {
        previewRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }
    previousGeneratedCoverImageRef.current = generatedCoverImage;
  }, [generatedCoverImage]);

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

    if (!formData.template.trim() || !formData.title.trim()) {
      setErrorMessage("აირჩიე შაბლონი და შეიყვანე წიგნის სახელი");
      return;
    }

    const selectedTemplate = COVER_TEMPLATES.find(
      (template) => template.value === formData.template,
    );

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const data = (await fetchProducts({
        method: "POST",
        id: null,
        bodyData: {
          book_id: bookId,
          title_text: formData.title.trim(),
          subtitle_text: formData.subtitle.trim() || null,
          author_name: formData.author.trim() || null,
          title_position: null,
          prompt_snapshot: {
            template: formData.template,
            title: formData.title.trim(),
            subtitle: formData.subtitle.trim() || null,
            author: formData.author.trim() || null,
            characters: getCharacterReferencesForPrompt(characterList),
          },
        },
        product: "cover",
      })) as CoverVersionApiFieldsGet | null;

      if (!data) {
        throw new Error("Failed to create cover");
      }

      if (data.status === "FAILED") {
        throw new Error(data.error_message || "Cover generation failed");
      }

      const imageFromApi = resolveImageUrl(
        data.thumbnail || data.generated_image,
      );
      if (imageFromApi) {
        setGeneratedCoverImage(imageFromApi);
      } else {
        setGeneratedCoverImage(
          selectedTemplate?.image ?? "/style-dramatic.jpeg",
        );
      }

      setErrorMessage(null);
    } catch {
      setErrorMessage("ყდის გენერაცია ვერ მოხერხდა");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      id="tab-cover"
      role="tabpanel"
      aria-labelledby="tab-cover-btn"
      className="edit-section"
    >
      <article className="cover-article lg:w-7/10 xl:w-6/10 mb-12">
        <ImageLightboxModal
          isOpen={Boolean(expandedImage)}
          imageSrc={expandedImage}
          imageAlt="გენერირებული ყდა"
          onClose={() => setExpandedImage(null)}
        />

        <h2>ნაბიჯი 3/4 • ყდის დამატება</h2>

        <div className="w-full flex flex-col items-center justify-center gap-6 lg:gap-10 px-6 py-6 lg:py-8">
          {generatedCoverImage && (
            <div
              ref={previewRef}
              className="rounded-2xl border-2 border-neutral-200 bg-white px-4 py-4 scroll-mt-20 flex flex-col items-center gap-2"
            >
              <p className="font-bold mb-2 !text-sm">წიგნის ყდა</p>
              <img
                src={generatedCoverImage}
                alt="გენერირებული ყდა"
                className="w-full max-w-md rounded-xl border-2 object-cover cursor-zoom-in"
                onClick={() => setExpandedImage(generatedCoverImage)}
              />
            </div>
          )}

          <div className="w-full max-w-3xl rounded-2xl border-2 border-neutral-200 bg-orange-50/40 px-4 py-3">
            <p className="font-bold">აირჩიე ყდის სტილი და შეავსე სათაური.</p>
          </div>

          {!generatedCoverImage && (
            <p className="w-full max-w-3xl text-neutral-500 text-xs md:text-sm">
              გენერირებული ყდა გამოჩნდება აქ შექმნის შემდეგ.
            </p>
          )}

          <div className="w-full flex flex-col items-center">
            <div className="w-full max-w-3xl mb-2 md:mb-6 text-left">
              <p className="font-bold">1) აირჩიე ყდის შაბლონი</p>
            </div>

            <div className="cover-templates">
              {COVER_TEMPLATES.map((template) => (
                <button
                  key={template.value}
                  type="button"
                  className={`img-container cover ${
                    formData.template === template.value
                      ? "ring-3 ring-yellow-500"
                      : ""
                  }`}
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      template: template.value,
                    }))
                  }
                  aria-pressed={formData.template === template.value}
                >
                  <img src={template.image} alt={template.label} />
                  <p>{template.label}</p>
                </button>
              ))}
            </div>

            <div className="w-full max-w-3xl mt-2 min-h-6">
              {formData.template ? (
                <p className="text-xs md:text-sm text-neutral-700">
                  არჩეული შაბლონი: <b>{formData.template}</b>
                </p>
              ) : (
                <p className="text-xs md:text-sm text-neutral-500">
                  ჯერ შაბლონი არ აგირჩევია.
                </p>
              )}
            </div>

            <div className="hint-div">
              <p>
                <b>*რჩევა:</b> <br />
                აირჩიე ყდის დიზაინი, რომელიც ყველაზე მეტად შეესაბამება წიგნის
                განწყობას.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="w-full max-w-3xl flex flex-col gap-4"
          >
            {errorMessage && <p className="text-red-500">{errorMessage}</p>}

            <fieldset
              className="w-full flex flex-col gap-4"
              disabled={isSubmitting}
            >
              <label className="flex flex-col gap-2">
                <p className="font-bold">2) წიგნის სახელი</p>
                <input
                  type="text"
                  name="coverTitle"
                  className="border-2 rounded-xl px-3 py-2"
                  placeholder="მაგ: გიორგის და ნინის თავგადასავალი"
                  value={formData.title}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      title: event.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label className="flex flex-col gap-2">
                <p className="font-bold">3) ქვე-სათაური (არასავალდებულო)</p>
                <input
                  type="text"
                  name="coverSubtitle"
                  className="border-2 rounded-xl px-3 py-2"
                  placeholder="მაგ: როგორ გავიცანით ერთმანეთი"
                  value={formData.subtitle}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      subtitle: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="flex flex-col gap-2">
                <p className="font-bold">4) საჩუქრის ავტორი (არასავალდებულო)</p>
                <input
                  type="text"
                  name="coverSubtitle"
                  className="border-2 rounded-xl px-3 py-2"
                  placeholder="მაგ: ნინი"
                  value={formData.author}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      author: event.target.value,
                    }))
                  }
                />
              </label>

              <button type="submit" className="border-2 rounded-2xl py-2 mt-2">
                {isSubmitting ? "იტვირთება..." : "ყდის დამატება"}
              </button>
            </fieldset>
          </form>
        </div>
      </article>
    </section>
  );
}
