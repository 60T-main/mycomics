import "../globals.css";

import Header from "../components/header";

export default function AuthRoot({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Header location="auth"></Header>
      {children}
    </>
  );
}
