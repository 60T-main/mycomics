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
            <img src="/style-dramatic.jpeg" alt="" />
          </div>
        </div>
      </article>
      <article className="cover-article">
        <h2>ყდის დამატება</h2>
        <div className="cover-create-content">
          <div className="cover-templates">
            <div className="img-container cover">
              <img src="/style-normal.jpeg" alt="" />
              <p>გმირული</p>
            </div>
            <div className="img-container cover">
              <img src="/style-drawn.jpeg" alt="" />
              <p>სახალისო</p>
            </div>
            <div className="img-container cover">
              <img src="/style-classic.jpeg" alt="" />
              <p>რომანტიკული</p>
            </div>
            <div className="img-container cover">
              <img src="/style-dramatic.jpeg" alt="" />
              <p>დრამატული</p>
            </div>
          </div>

          <div className="hint-div">
            <p>
              *რჩევა: <br />
              აირჩიე ყდის დიზაინი, რომელიც ყველაზე მეტად შეესაბამება წიგნის
              განწყობას.
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
                  <span>წიგნის ქვე-სახელი</span>
                  <span className="text-xs">*არასავალდებულო</span>
                  <input
                    type="text"
                    name="characterName"
                    className="border-2 rounded-xl px-3 py-2"
                    placeholder="შეიყვანე წიგნის ქვე-სახელი"
                    required
                  />
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
