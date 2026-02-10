"use client";

import ImageUpload from "./image-upload";

import { useState, useEffect } from "react";

export default function CoverEditSection() {
  const [uploaded, setUploaded] = useState(false);

  useEffect(() => {
    uploaded && setErrorMessage(null);
  }, [uploaded]);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  return (
    <section
      id="tab-cover"
      role="tabpanel"
      aria-labelledby="tab-cover-btn"
      className="edit-section"
    >
      <article className="cover-preview">
        <h2>ჩემი წიგნის ყდა</h2>
        <div className="cover-div">
          <div className="cover-container">
            <img src="/supergirl.png" alt="" />
          </div>
        </div>
      </article>
      <article className="cover-article">
        <h2>ყდის დამატება</h2>
        <div className="cover-create-content">
          <div className="hint-div">
            <p>
              *რჩევა: <br />
              საუკეთესო შედეგისთვის გამოიყენე ფოტო, სადაც სახე მკაფიოდ ჩანს.
            </p>
          </div>
          <form className="w-full max-w-md flex flex-col gap-4 mt-6 px-6 pb-6">
            {errorMessage && <p className="text-red-500">{errorMessage}</p>}
            <div className="relative">
              {!uploaded && (
                <button
                  type="button"
                  className="absolute inset-0 z-10 cursor-not-allowed bg-transparent"
                  onClick={() => {
                    setErrorMessage("ჯერ ატვირთე ფოტო");
                  }}
                  aria-label="Upload required"
                />
              )}
              <fieldset
                disabled={!uploaded}
                className="flex flex-col gap-4 disabled:opacity-50"
              >
                <label className="flex flex-col gap-2">
                  <span>წიგნის სახელი</span>
                  <input
                    type="text"
                    name="characterName"
                    className="border-2 rounded-xl px-3 py-2"
                    placeholder="შეიყვანე წიგნის სახელი"
                    required
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span>სტილი</span>
                  <select
                    name="characterClothes"
                    className="border-2 rounded-xl px-3 py-2"
                    defaultValue=""
                    required
                  >
                    <option value="" disabled>
                      აირჩიე სტილი
                    </option>
                    <option value="casual">კომიქსი</option>
                    <option value="formal">ანიმე / მანგა</option>
                    <option value="sport">Disney</option>
                    <option value="sport">Pixar</option>
                    <option value="sport">Cyberpunk</option>
                    <option value="sport">Gothic</option>
                  </select>
                </label>

                <button type="submit" className="border-2 rounded-2xl py-2">
                  დამატება
                </button>
              </fieldset>
            </div>
          </form>
        </div>
      </article>
    </section>
  );
}
