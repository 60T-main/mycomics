export default function Header() {
  return (
    <header>
      <div className="effect"></div>
      <div className="tint"></div>
      <div className="shine"></div>
      <div className="header-content">
        <div className="dock">
          <img
            className="header-logo"
            src="logo.png"
            alt="website logo 'mycomics.ge'"
          />
          <div className="header-links">
            <a className="header-prices" href="#prices-article">
              ფასები
            </a>
            <a className="header-action" href="/">
              შეკვეთა
            </a>
          </div>
          <i className="bi bi-list"></i>
        </div>
      </div>
    </header>
  );
}
