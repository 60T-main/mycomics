"use client";

import ImageUpload from "./image-upload";

import { useState, useEffect } from "react";

export default function PageEditSection() {
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
      <article className="pages-preview">
        <h2>გვერდები</h2>
        <div className="pages-preview-content min-h-110 w-full">
          <div className="pages-div grid grid-cols-3 place-items-center w-full min-h-95">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="img-container pages">
                <img src="/supergirl.png" alt="" />
                <i className="bi bi-three-dots"></i>
                <p>{i + 1}</p>
              </div>
            ))}
          </div>
        </div>
      </article>
      <article className="cover-article">
        <h2>გვერდის დამატება</h2>
        <div className="cover-create-content">
          <div className="hint-div">
            <p>
              *რჩევა: <br />
              საუკეთესო შედეგისთვის გამოიყენე ფოტო, სადაც სახე მკაფიოდ ჩანს.
            </p>
          </div>
          <form className="w-full max-w-md flex flex-col gap-4 mt-6 px-6 pb-6">
            <div className="relative">
              <fieldset className="flex flex-col gap-4 disabled:opacity-50">
                <label className="flex flex-col gap-2">
                  <span>რა ხდება ამ გვერდზე?</span>
                  <input
                    type="text"
                    name="characterName"
                    className="border-2 rounded-xl px-3 py-2 h-40"
                    placeholder="დაწერე გვერდის ისტორია"
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
