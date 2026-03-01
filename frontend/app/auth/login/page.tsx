import AuthRoot from "../layout";
import Link from "next/link";

export default function LoginPage() {
  return (
    <AuthRoot>
      <section className="auth-section login-section relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#FBC564_140%)] px-4 pb-16 pt-28 md:px-12">
        <div
          className="absolute inset-0 bg-[url('/bg.png')] bg-cover bg-center opacity-10"
          aria-hidden
        />
        <div className="relative z-10 mx-auto flex w-full max-w-xl flex-col items-center">
          <div className="w-full rounded-4xl border-3 bg-white/90 p-6 shadow-[var(--shadow)] backdrop-blur-sm md:p-10">
            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="inline-font text-2xl font-bold md:text-3xl">
                შესვლა
              </h1>
              <p className="text-xs text-neutral-600 md:text-sm">
                კეთილი დაბრუნება. შეიყვანე მონაცემები რომ გააგრძელო.
              </p>
            </div>

            <form className="mt-6 flex flex-col gap-4">
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
                <span>პაროლი</span>
                <input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  placeholder="შეიყვანე პაროლი"
                  className="rounded-xl border-2 bg-white px-3 py-2"
                  required
                />
              </label>

              <div className="flex flex-col gap-3 text-xs md:flex-row md:items-center md:justify-between md:text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="remember"
                    className="h-4 w-4 accent-[var(--color-secondary)]"
                  />
                  დამიმახსოვრე
                </label>
                <Link
                  href="/auth/forgot"
                  className="font-bold text-neutral-700 hover:text-black"
                >
                  დაგავიწყდა პაროლი?
                </Link>
              </div>

              <button
                type="submit"
                className="rounded-3xl border-2 bg-[var(--color-secondary)] py-3 text-center font-bold shadow-[var(--shadow)] transition-all duration-200 hover:bg-[var(--color-hover)]"
              >
                შესვლა
              </button>
            </form>
          </div>

          <p className="!mt-6 text-center text-xs md:text-sm">
            არ გაქვს ანგარიში?{" "}
            <Link
              href="/auth/register"
              className="font-bold text-neutral-700 hover:text-black"
            >
              შექმენი ახლავე
            </Link>
          </p>
        </div>
      </section>
    </AuthRoot>
  );
}
