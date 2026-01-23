export default function LandingBanner() {
  return (
    <main className="landing-page">
      <section className="landing-banner-section">
        <article className="landing-row-1">
          <h1 className="inline-font">შექმენი საკუთარი კომიქსი</h1>
          <p>შენ და შენი საყვარელი ადამიანები მთავარ როლში</p>

          <div className="landing-couples-books">
            <div className="landing-couples">
              <img
                className="landing-couple"
                src="/couple.jpg"
                alt="photo of a couple"
              />
            </div>

            <img
              className="w-20 object-contain"
              src="/arrow.png"
              alt="photo of a couple"
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
        <article className="steps row-start-2 col-span-1 border-r-2">
          <h3 className="inline-font font-bold">ატვირთე ფოტოები</h3>
          <img
            src="/upload.jpeg"
            alt="ai image of uploading image on smartphone"
          />
        </article>
        <article className="steps row-start-2 col-span-1 border-r-2">
          <h3 className="inline-font font-bold">აირჩიე სტილი</h3>
          <img
            src="/draw.jpeg"
            alt="ai image of drawing superheros on a comic book"
          />
        </article>
        <article className="steps row-start-2 col-span-1">
          <h3 className="inline-font font-bold">მიიღე მზა კომიქსი</h3>
          <img
            src="/finished.jpeg"
            alt="ai image of a hand holding a comic book"
          />
        </article>
        <article className="row-start-3 row-end-4 col-span-3">Col 4</article>
      </section>
    </main>
  );
}
