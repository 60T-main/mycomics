"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type CoverFormState = {
  template: string;
  title: string;
  subtitle: string;
};

const COVER_TEMPLATES = [
  { value: "heroic", label: "გმირული", image: "/style-normal.jpeg" },
  { value: "fun", label: "სახალისო", image: "/style-drawn.jpeg" },
  { value: "romantic", label: "რომანტიკული", image: "/style-classic.jpeg" },
  { value: "dramatic", label: "დრამატული", image: "/style-dramatic.jpeg" },
];

export default function CoverEditSection() {
  const [formData, setFormData] = useState<CoverFormState>({
    template: "",
    title: "",
    subtitle: "",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generatedCoverImage, setGeneratedCoverImage] = useState<string | null>(
    null,
  );
  const previewRef = useRef<HTMLDivElement | null>(null);
  const previousGeneratedCoverImageRef = useRef<string | null>(null);

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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formData.template.trim() || !formData.title.trim()) {
      setErrorMessage("აირჩიე შაბლონი და შეიყვანე წიგნის სახელი");
      return;
    }

    const selectedTemplate = COVER_TEMPLATES.find(
      (template) => template.value === formData.template,
    );
    setGeneratedCoverImage(selectedTemplate?.image ?? "/style-dramatic.jpeg");
    setErrorMessage(null);
  };

  return (
    <section
      id="tab-cover"
      role="tabpanel"
      aria-labelledby="tab-cover-btn"
      className="edit-section"
    >
      <article className="cover-article lg:w-7/10 xl:w-6/10 mb-12">
        <h2>ნაბიჯი 3/4 • ყდის დამატება</h2>

        <div className="w-full flex flex-col items-center justify-center gap-6 lg:gap-10 px-6 py-6 lg:py-8">
          {generatedCoverImage && (
            <div
              ref={previewRef}
              className="rounded-2xl border-2 border-neutral-200 bg-white px-4 py-4"
            >
              <p className="font-bold mb-2">ჩემი ყდა</p>
              <img
                src={generatedCoverImage}
                alt="გენერირებული ყდა"
                className="w-full max-w-md rounded-xl border-2 object-cover"
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

            <fieldset className="w-full flex flex-col gap-4">
              <label className="flex flex-col gap-2">
                <span>2) წიგნის სახელი</span>
                <input
                  type="text"
                  name="coverTitle"
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

              <label className="flex flex-col gap-2">
                <span>3) ქვე-სათაური (არასავალდებულო)</span>
                <input
                  type="text"
                  name="coverSubtitle"
                  className="border-2 rounded-xl px-3 py-2"
                  placeholder="მაგ: თავგადასავალი იწყება"
                  value={formData.subtitle}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      subtitle: event.target.value,
                    }))
                  }
                />
              </label>

              <button type="submit" className="border-2 rounded-2xl py-2 mt-2">
                დამატება და გაგრძელება
              </button>
            </fieldset>
          </form>
        </div>
      </article>
    </section>
  );
}
