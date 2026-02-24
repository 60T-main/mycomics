"use client";

import ImageUpload from "./image-upload";

import { useState, useEffect } from "react";

import OptionsModal from "./options-modal";

import { useSelectOptionsModalStore } from "../store/useOptionsModalStateStore";

import {
  useDropdownOutsideClick,
  useDropdownTriggerStore,
} from "../store/useDropdownTriggerStore";

export default function PageEditSection() {
  const [uploaded, setUploaded] = useState(false);

  const { openCardId, setOpenCardId } = useSelectOptionsModalStore();

  const { DropdownTrigger } = useDropdownTriggerStore();
  const { cardRefs } = useDropdownOutsideClick();

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
        <div className="pages-content">
          <h2>გვერდები</h2>
          <div className="pages-preview-content min-h-110 w-full">
            <div className="pages-div">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i + 12345}
                  className="img-container pages"
                  ref={(el) => {
                    if (el) cardRefs.current[String(i + 12345)] = el;
                  }}
                >
                  <img src="/supergirl.png" alt="" />
                  <i
                    onClick={() => {
                      DropdownTrigger(String(i + 12345));
                    }}
                    className="bi bi-three-dots"
                  ></i>
                  <p>{i + 1}</p>
                  <div
                    className={`${openCardId != String(i + 12345) ? "hidden" : ""}`}
                  >
                    <OptionsModal></OptionsModal>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </article>
      <article className="cover-article">
        <h2>გვერდის დამატება</h2>
        <div className="cover-create-content">
          <h3 className="mt-4 font-bold">აირჩიეთ გვერდის შაბლონი</h3>
          <div className="page-templates-parent">
            <div className="cover-templates">
              <div className="img-container cover">
                <img src="/style-normal.jpeg" alt="" />
                <p>📖კლასიკური</p>
              </div>
              <div className="img-container cover">
                <img src="/style-drawn.jpeg" alt="" />
                <p>⚡მოქმედებითი</p>
              </div>
              <div className="img-container cover">
                <img src="/style-classic.jpeg" alt="" />
                <p>❤️რომანტიკული</p>
              </div>
              <div className="img-container cover">
                <img src="/style-dramatic.jpeg" alt="" />
                <p>🎬დრამატული</p>
              </div>
            </div>
          </div>
          <div className="hint-div">
            <p>
              <b>*რჩევა:</b> <br />
              დაწერე მოკლე და კონკრეტული სცენის აღწერა.
            </p>
          </div>
          <form className="w-full max-w-md flex flex-col gap-4 mt-6 px-6 pb-6">
            <div className="relative">
              <fieldset className="flex flex-col gap-4 disabled:opacity-50">
                <label className="flex flex-col gap-2">
                  <span>რა ხდება ამ გვერდზე?</span>
                  <textarea
                    name="characterName"
                    className="border-2 rounded-xl px-3 py-2 h-40 resize-none"
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
