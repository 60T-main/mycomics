"use client";

import { FormEvent, useState } from "react";
import fetchProducts from "../services/product/product-api";
import { BookApiFieldsPost } from "../services/product/product-types";

import { useRouter } from "next/navigation";

type BookFormState = {
  title: string;
  art_style: string;
};

const STYLE_OPTIONS = [
  {
    value: "Anime/Manga",
    labelKa: "ანიმე / მანგა",
    image: "/style-normal.jpeg",
    alt: "ანიმე / მანგა",
  },
  {
    value: "Ghibli Style",
    labelKa: "გიბლი",
    image: "/style-drawn.jpeg",
    alt: "გიბლი",
  },
  {
    value: "American Comic Book",
    labelKa: "კომიქსი",
    image: "/style-classic.jpeg",
    alt: "კომიქსი",
  },
  {
    value: "Pixar",
    labelKa: "პიქსარი",
    image: "/style-dramatic.jpeg",
    alt: "პიქსარი სტილი",
  },
  {
    value: "Disney Golden Age",
    labelKa: "დისნეი",
    image: "/style-dramatic.jpeg",
    alt: "დისნეი",
  },
  {
    value: "Cyberpunk",
    labelKa: "Cyberpunk",
    image: "/style-dramatic.jpeg",
    alt: "Cyberpunk",
  },
];

export default function BookEditSection() {
  const router = useRouter();
  const [formData, setFormData] = useState<BookFormState>({
    title: "",
    art_style: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setErrorMessage(null);
    setSuccessMessage(null);

    if (!formData.title.trim() || !formData.art_style.trim()) {
      setErrorMessage("წიგნის სახელი და სტილი აუცილებელია");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: BookApiFieldsPost = {
        title: formData.title.trim(),
        art_style: formData.art_style.trim(),
        style_version: null,
        print_size: null,
        paper_type: null,
        binding_type: null,
      };

      const result = await fetchProducts({
        method: "POST",
        id: null,
        bodyData: payload,
        product: "books",
      });

      if (!result) {
        throw new Error("BOOK_CREATE_FAILED");
      }

      setSuccessMessage("წიგნი წარმატებით შეიქმნა");
      setFormData((prev) => ({
        ...prev,
        title: "",
      }));
      router.replace("/create");
    } catch {
      setErrorMessage("წიგნის შექმნა ვერ მოხერხდა, სცადე თავიდან");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      id="tab-book"
      role="tabpanel"
      aria-labelledby="tab-cover-btn"
      className="edit-section book"
    >
      <article className="cover-article book">
        <h2>ნაბიჯი 1/4 • წიგნის შექმნა</h2>
        <div className="w-full flex flex-col items-center justify-center gap-6 lg:gap-10 px-6 py-6 lg:py-8">
          <div className="w-full max-w-3xl rounded-2xl border-2 border-neutral-200 bg-orange-50/40 px-4 py-3">
            <p className="font-bold">აირჩიე სტილი და დაარქვი წიგნს სახელი.</p>
          </div>

          <div className="w-full flex flex-col items-center">
            <div className="w-full max-w-3xl mb-2 md:mb-6 text-left">
              <p className="font-bold">აირჩიე ილუსტრაციის სტილი</p>
              <p className="text-neutral-700 text-xs md:text-sm">
                აირჩიე ერთი სტილი და გააგრძელე შემდეგ ნაბიჯზე.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-12 place-items-center w-full py-0 md:pt-0">
              {STYLE_OPTIONS.map((style) => (
                <button
                  key={style.value}
                  type="button"
                  className={`img-container cover ${
                    formData.art_style === style.value
                      ? "ring-3 ring-yellow-500"
                      : ""
                  }`}
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, art_style: style.value }))
                  }
                  aria-pressed={formData.art_style === style.value}
                >
                  <img src={style.image} alt={style.alt} />
                  <p>{style.labelKa}</p>
                </button>
              ))}
            </div>
            <div className="w-full max-w-3xl mt-3 min-h-6 mt-10">
              {formData.art_style ? (
                <p className="text-xs md:text-sm text-neutral-700">
                  არჩეული სტილი: <b>{formData.art_style}</b>
                </p>
              ) : (
                <p className="text-xs md:text-sm text-neutral-500">
                  ჯერ სტილი არ აგირჩევია.
                </p>
              )}
            </div>

            <div className="hint-div">
              <p>
                <b>*რჩევა:</b> <br />
                სტილის შეცვლას შექმნის შემდეგ ვეღარ შეძლებ.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="w-full lg:w-1/2 max-w-md flex flex-col gap-4"
          >
            {errorMessage && <p className="text-red-500">{errorMessage}</p>}
            {successMessage && (
              <p className="text-green-600">{successMessage}</p>
            )}

            <label className="flex flex-col gap-2">
              <span>წიგნის სახელი</span>
              <input
                type="text"
                name="title"
                className="border-2 rounded-xl px-3 py-2"
                placeholder="მაგ: დაკარგული ქალაქის გმირები"
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

            <input type="hidden" name="art_style" value={formData.art_style} />

            <button
              type="submit"
              className="border-2 rounded-2xl py-2 mt-2 "
              disabled={isSubmitting}
            >
              {isSubmitting ? "იქმნება..." : "წიგნის შექმნა და გაგრძელება"}
            </button>
          </form>
        </div>
      </article>
    </section>
  );
}
