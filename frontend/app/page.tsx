import Header from "./components/header";
import LandingBanner from "./components/landing-banner";
import "./globals.css";

export default function Home() {
  return (
    <>
      <Header location="home"></Header>
      <LandingBanner />
    </>
  );
}
