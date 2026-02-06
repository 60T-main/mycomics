import PlanCarousel from "./price-plan";

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
            <a className="action-button z-5" href="/">
              შეუკვეთე შენი კომიქსი
            </a>
          </div>
          <img className="superman" src="/superman.png" alt="" />
          <img className="supergirl" src="/supergirl.png" alt="" />
        </article>
        <article className="landing-couples-books inline-font">
          <div className="landing-couples-text">
            <h2>მიიღე პერსონალური კომიქსის წიგნი</h2>
          </div>

          <div className="landing-couples-books-inner">
            <div className="landing-couples">
              <img
                className="landing-couple"
                src="/couple2.png"
                alt="illustration of a hand holding a phone with a photo of a couple"
              />
            </div>
            <img
              className="arrow-png"
              src="/arrow.png"
              alt="iamge of an arrow icon"
            />
            <div className="landing-books">
              <img
                className="landing-book"
                src="/comic-books.png"
                alt="ai image of couple in manga setting"
              />
            </div>
          </div>
        </article>
        <article className="steps">
          {/* <img
            className="transform -scale-x-100"
            src="border.png"
            alt="image of a lightning shaped border"
          /> */}
          <div className="step step-1 relative">
            <img className="design-element e-1" src="text-photo.png" alt="" />
            {/* <img className="design-element e-2" src="photo.png" alt="" /> */}
            {/* <img className="design-element e-3" src="smartphone.png" alt="" />
            <img className="design-element e-4" src="shutter.png" alt="" /> */}
            <h2 className="step-number">ნაბიჯი 1 / 3</h2>
            <div className="steps-content">
              <img
                className="steps-img steps-img-1"
                src="superman-phone.png"
                alt="superhero man hovering while holding a smartphone"
              />
              <div className="steps-text-div">
                <h3 className="inline-font font-bold">ატვირთე ფოტო</h3>
                <p className="inline-font font-bold">
                  გადაიქეცი კომიქსის გმირად
                </p>
              </div>
            </div>

            {/* <img src="border.png" alt="image of a lightning shaped border" /> */}
          </div>
          <div className="step step-2 relative">
            <img className="design-element a-1" src="pencil.png" alt="" />
            <img className="design-element a-2" src="brush.png" alt="" />
            <img className="design-element a-3" src="ruler.png" alt="" />
            <img className="design-element a-4" src="pen.png" alt="" />
            <h2 className="step-number">ნაბიჯი 2 / 3</h2>
            <div className="steps-content">
              <div className="steps-text-div">
                <h3 className="inline-font font-bold">შეარჩიე სტილი</h3>
                <p className="inline-font font-bold">
                  კომიქსი, მანგა, ფენტეზი...
                </p>
              </div>

              <img
                className="steps-img steps-img-2"
                src="supergirl-drawing.png"
                alt="superhero woman hovering while holding a comic book and scribbling inside it"
              />
            </div>

            {/* <img
              className="transform -scale-x-100"
              src="border.png"
              alt="image of a lightning shaped border"
            /> */}
          </div>
          <div className="step step-3">
            <h2 className="step-number">ნაბიჯი 3 / 3</h2>
            <div className="steps-content">
              <img
                className="steps-img steps-img-3"
                src="couple-reading.png"
                alt="superhero woman hovering while holding a comic book and scribbling inside it"
              />
              <div className="steps-text-div">
                <h3 className="inline-font font-bold">მიიღე მზა წიგნი</h3>
                <p className="inline-font font-bold">დაბეჭდილი წიგნი ან PDF</p>
              </div>
            </div>
          </div>
        </article>
        {/* <article className="steps step-1 relative">
          <h3 className="inline-font font-bold">ატვირთე ფოტოები</h3>

        </article>
        <article className="steps step-2 relative">
          <h3 className="inline-font font-bold">აირჩიე სტილი</h3>
          <img
            className="absolute bottom-2"
            src="border.png"
            alt="image of a lightning shaped border"
          />
        </article>
        <article className="steps step-3">
          <h3 className="inline-font font-bold">მიიღე მზა კომიქსი</h3>
        </article> */}
        <PlanCarousel></PlanCarousel>
      </section>
    </main>
  );
}
