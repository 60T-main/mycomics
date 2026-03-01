import AuthRoot from "../layout";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <AuthRoot>
      <section className="auth-section register-section relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#FBC564_140%)] px-4 pb-16 pt-28 md:px-12">
        <div
          className="absolute inset-0 bg-[url('/bg.png')] bg-cover bg-center opacity-10"
          aria-hidden
        />
        <div className="relative z-10 mx-auto flex w-full max-w-xl flex-col items-center">
          <div className="w-full rounded-4xl border-3 bg-white/90 p-6 shadow-[var(--shadow)] backdrop-blur-sm md:p-10">
            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="inline-font text-2xl font-bold md:text-3xl">
                რეგისტრაცია
              </h1>
              <p className="text-xs text-neutral-600 md:text-sm">
                შექმენი ანგარიში და დაიწყე შენი კომიქსის შექმნა.
              </p>
            </div>

            <form className="mt-6 flex flex-col gap-4">
              <label className="flex flex-col gap-2">
                <span>სახელი და გვარი</span>
                <input
                  type="text"
                  name="fullName"
                  autoComplete="name"
                  placeholder="შეიყვანე სახელი და გვარი"
                  className="rounded-xl border-2 bg-white px-3 py-2"
                  required
                />
              </label>

              <label className="flex flex-col gap-2">
                <span>ელ. ფოსტა</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="name@email.com"
                  className="rounded-xl border-2 bg-white px-3 py-2"
                  required
                />
              </label>

              <label className="flex flex-col gap-2">
                <span>ტელეფონის ნომერი</span>
                <input
                  type="tel"
                  name="phone"
                  autoComplete="tel"
                  placeholder="+995 5XX XX XX XX"
                  className="rounded-xl border-2 bg-white px-3 py-2"
                  required
                />
              </label>

              <label className="flex flex-col gap-2">
                <span>პაროლი</span>
                <input
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  placeholder="შეიყვანე პაროლი"
                  className="rounded-xl border-2 bg-white px-3 py-2"
                  required
                />
              </label>

              <label className="flex flex-col gap-2">
                <span>დაადასტურე პაროლი</span>
                <input
                  type="password"
                  name="confirmPassword"
                  autoComplete="new-password"
                  placeholder="გაიმეორე პაროლი"
                  className="rounded-xl border-2 bg-white px-3 py-2"
                  required
                />
              </label>

              <label className="flex items-start gap-2 text-xs md:text-sm">
                <input
                  type="checkbox"
                  name="terms"
                  className="mt-1 h-4 w-4 accent-[var(--color-secondary)]"
                  required
                />
                <span>ვეთანხმები პირობებს და კონფიდენციალურობის პოლიტიკას</span>
              </label>

              <button
                type="submit"
                className="rounded-3xl border-2 bg-[var(--color-secondary)] py-3 text-center font-bold shadow-[var(--shadow)] transition-all duration-200 hover:bg-[var(--color-hover)]"
              >
                ანგარიშის შექმნა
              </button>
            </form>
          </div>

          <p className="!mt-6 text-center text-xs md:text-sm">
            უკვე გაქვს ანგარიში?{" "}
            <Link
              href="/auth/login"
              className="font-bold text-neutral-700 hover:text-black"
            >
              გაიარე ავტორიზაცია
            </Link>
          </p>
        </div>
      </section>
    </AuthRoot>
  );
}
