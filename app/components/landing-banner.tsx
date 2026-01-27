export default function LandingBanner() {
  return (
    <main className="landing-page">
      <section className="landing-banner-section">
        <article className="landing-row-1">
          <div className="landing-text">
            <h1 className="inline-font">შექმენი საკუთარი კომიქსი</h1>
            <p className="inline-font">
              შენ და შენი საყვარელი ადამიანები მთავარ როლში
            </p>
            <a className="action-button" href="/">
              შეუკვეთე შენი კომიქსი
            </a>
          </div>

          <img className="superman" src="/superman.png" alt="" />
          <img className="supergirl" src="/supergirl.png" alt="" />
        </article>
        <article className="steps step-1">
          <h3 className="inline-font font-bold">ატვირთე ფოტოები</h3>
        </article>
        <article className="steps step-2 ">
          <h3 className="inline-font font-bold">აირჩიე სტილი</h3>
        </article>
        <article className="steps step-3">
          <h3 className="inline-font font-bold">მიიღე მზა კომიქსი</h3>
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
                alt="photo of a couple"
              />
            </div>
            <div className="landing-books">
              <img
                className="landing-book"
                src="/comic-books.png"
                alt="ai image of couple in manga setting"
              />
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
