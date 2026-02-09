"use client";

import ImageUpload from "../components/image-upload";

import Header from "../components/header";
import Footer from "../components/footer";

import "../globals.css";

import { useState, useEffect } from "react";

export default function CreatePage() {
  const [uploaded, setUploaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    uploaded && setErrorMessage(null);
  }, [uploaded]);

  return (
    <>
      <Header location={"edit"}></Header>

      <main className="edit-page">
        <section
          id="tab-characters"
          role="tabpanel"
          aria-labelledby="tab-characters-btn"
          className="edit-section flex flex-col items-center justify-center gap-10 md:gap-20"
        >
          <article className="character-preview flex flex-col items-center justify-center bg-gray border-2 w-9/10 rounded-3xl shadow-[var(--shadow)]">
            <h2>ჩემი პერსონაჟები</h2>
            <div className="characters-div flex flex-row items-center justify-center py-12 min-h-60 gap-2">
              <div className="img-container">
                <img src="/supergirl.png" alt="" />
                <p>ანა</p>
                <i className="bi bi-three-dots"></i>
              </div>
              <div className="img-container">
                <img src="/superman.png" alt="" />
                <p>ნიკა</p>
                <i className="bi bi-three-dots"></i>
              </div>
              <div className="img-container">
                <img src="/supergirl-drawing.png" alt="" />
                <p>ბცმცი</p>
                <i className="bi bi-three-dots"></i>
              </div>
            </div>
          </article>
          <article className="character-article flex flex-col items-center justify-center bg-gray border-2 w-9/10 rounded-3xl shadow-[var(--shadow)]">
            <h2>პერსონაჟის დამატება</h2>
            <ImageUpload setUploaded={setUploaded}></ImageUpload>
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
                    <span>პერსონაჟის სახელი</span>
                    <input
                      type="text"
                      name="characterName"
                      className="border-2 rounded-xl px-3 py-2"
                      placeholder="შეიყვანე სახელი"
                      required
                    />
                  </label>

                  <label className="flex flex-col gap-2">
                    <span>ტანსაცმელი</span>
                    <select
                      name="characterClothes"
                      className="border-2 rounded-xl px-3 py-2"
                      defaultValue=""
                      required
                    >
                      <option value="" disabled>
                        აირჩიე ტანსაცმელი
                      </option>
                      <option value="casual">ყოველდღიური</option>
                      <option value="formal">ოფიციალური</option>
                      <option value="sport">სპორტული</option>
                    </select>
                  </label>

                  <button type="submit" className="border-2 rounded-2xl py-2">
                    დამატება
                  </button>
                </fieldset>
              </div>
            </form>
          </article>
        </section>
      </main>
      <Footer></Footer>
    </>
  );
}
