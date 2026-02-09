import PlanCarousel from "./price-plan";

import Link from "next/link";

export default function LandingBanner() {
  return (
    <main className="landing-page">
      <section className="landing-banner-section">
        <article className="landing-row-1">
          <img
            className="cloud cloud1"
            src="/cloud1.png"
            alt="image of a cloud"
          />
          <img
            className="cloud cloud2"
            src="/cloud2.png"
            alt="image of a cloud"
          />
          <img
            className="cloud cloud3"
            src="/cloud3.png"
            alt="image of a cloud"
          />
          <div className="landing-text">
            <h1 className="inline-font">შექმენი საკუთარი კომიქსი</h1>
            <p className="inline-font">
              შენ და შენი საყვარელი ადამიანები მთავარ როლში
            </p>
            <Link className="action-button z-5" href="/create">
              შეუკვეთე შენი კომიქსი
            </Link>
          </div>
          <img className="superman" src="/superman.png" alt="" />
          <img className="supergirl" src="/supergirl.png" alt="" />
        </article>
        <article className="steps" id="steps-article">
          <div className="step step-1">
            <div className="relative">
              <h2 className="step-number ">ნაბიჯი 1 / 3</h2>
              <img className="design-element e-1" src="text-photo.png" alt="" />
            </div>

            <div className="steps-content">
              <img
                className="steps-img steps-img-1"
                src="superman-phone.png"
                alt="superhero man hovering while holding a smartphone"
              />
              <div className="steps-text-div">
                <h2 className="step-number-2">ნაბიჯი 1 / 3</h2>
                <h3 className="inline-font font-bold">ატვირთე ფოტო</h3>
                <p className="inline-font font-bold">
                  სასურველია სახეები ჩანდეს
                </p>
              </div>
            </div>
          </div>
          <div className="step step-2">
            <div className="relative">
              <h2 className="step-number">ნაბიჯი 2 / 3</h2>
              <img className="design-element a-1" src="pen.png" alt="" />
            </div>
            <div className="steps-content">
              <div className="steps-text-div">
                <h2 className="step-number-2">ნაბიჯი 2 / 3</h2>
                <h3 className="inline-font font-bold">შეარჩიე სტილი</h3>
                <p className="inline-font font-bold">
                  კომიქსი, მანგა, ფენტეზი...
                </p>
              </div>

              <img
                className="steps-img steps-img-2"
                src="supergirl-drawing.png"
                alt="superhero woman hovering while holding a paint brush"
              />
            </div>
          </div>
          <div className="step step-3 relative">
            <div className="relative">
              <img className="design-element b-1" src="book.png" alt="" />
              <h2 className="step-number">ნაბიჯი 3 / 3</h2>
            </div>

            <div className="steps-content">
              <img
                className="steps-img steps-img-3"
                src="couple-reading.png"
                alt="superhero couple hovering while holding a comic book together"
              />
              <div className="steps-text-div">
                <h2 className="step-number-2">ნაბიჯი 3 / 3</h2>
                <h3 className="inline-font font-bold">მიიღე მზა წიგნი</h3>
                <p className="inline-font font-bold">
                  ხარისხიანი დაბეჭდილი წიგნი
                </p>
              </div>
            </div>
          </div>
        </article>
        <PlanCarousel></PlanCarousel>
      </section>
    </main>
  );
}
