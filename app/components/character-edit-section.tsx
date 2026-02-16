"use client";

import ImageUpload from "../components/image-upload";

import { useState, useEffect, useRef } from "react";

export default function CharacterEditSection() {
  const [uploaded, setUploaded] = useState(false);

  const [openCardId, setOpenCardId] = useState<string | null>(null);

  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const DropdownTrigger = (elementId: string) => {
    setOpenCardId(openCardId === elementId ? null : elementId);
  };

  useEffect(() => {
    uploaded && setErrorMessage(null);
  }, [uploaded]);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      const target = e.target as Node | null;
      const isClickInsideCard = target
        ? Object.values(cardRefs.current).some(
            (cardRef) => cardRef && cardRef.contains(target),
          )
        : false;
      if (!isClickInsideCard) {
        setOpenCardId(null);
      }
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  return (
    <section
      id="tab-characters"
      role="tabpanel"
      aria-labelledby="tab-characters-btn"
      className="edit-section"
    >
      <article className="character-preview">
        <h2>ჩემი პერსონაჟები</h2>
        <div className="characters-content">
          <div className="characters-screen"></div>
          <div className="characters-div">
            <div
              className="img-container character"
              key={"1"}
              ref={(el) => {
                if (el) cardRefs.current["1"] = el;
              }}
            >
              <img src="/supergirl.png" alt="" />
              <p>ანა</p>
              <i
                className="bi bi-three-dots"
                onClick={() => {
                  DropdownTrigger("1");
                }}
              ></i>
              <div
                className={`dropdown character ${openCardId != "1" ? "hidden" : ""}`}
              >
                <div className="effect"></div>
                <div className="tint"></div>
                <div className="shine"></div>
                <div className="dropdown-content">
                  <button className="edit">რედაქტირება</button>
                  <button className="delete">წაშლა</button>
                </div>
              </div>
            </div>
            <div
              className="img-container character"
              key={"2"}
              ref={(el) => {
                if (el) cardRefs.current["2"] = el;
              }}
            >
              <img src="/superman.png" alt="" />
              <p>ნიკა</p>
              <i
                className="bi bi-three-dots"
                onClick={() => {
                  DropdownTrigger("2");
                }}
              ></i>
              <div
                className={`dropdown character ${openCardId != "2" ? "hidden" : ""}`}
              >
                <div className="effect"></div>
                <div className="tint"></div>
                <div className="shine"></div>
                <div className="dropdown-content">
                  <button className="edit">რედაქტირება</button>
                  <button className="delete">წაშლა</button>
                </div>
              </div>
            </div>
            <div
              className="img-container character"
              key={"3"}
              ref={(el) => {
                if (el) cardRefs.current["3"] = el;
              }}
            >
              <img src="/supergirl-drawing.png" alt="" />
              <p>ბცმცი</p>
              <i
                className="bi bi-three-dots"
                onClick={() => {
                  DropdownTrigger("3");
                }}
              ></i>
              <div
                className={`dropdown character ${openCardId != "3" ? "hidden" : ""}`}
              >
                <div className="effect"></div>
                <div className="tint"></div>
                <div className="shine"></div>
                <div className="dropdown-content">
                  <button className="edit">რედაქტირება</button>
                  <button className="delete">წაშლა</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>
      <article className="character-article">
        <h2>პერსონაჟის დამატება</h2>
        <div className="character-upload-content">
          <ImageUpload setUploaded={setUploaded}></ImageUpload>
          <div className="hint-div">
            <p>
              <b>*რჩევა:</b> <br />
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
                  <span>სქესი</span>
                  <select
                    name="characterClothes"
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
