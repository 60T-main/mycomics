import AuthRoot from "../layout";
import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <AuthRoot>
      <section className="auth-section forgot-section relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#FBC564_140%)] px-4 pb-16 pt-28 md:px-12">
        <div
          className="absolute inset-0 bg-[url('/bg.png')] bg-cover bg-center opacity-10"
          aria-hidden
        />
        <div className="relative z-10 mx-auto flex w-full max-w-xl flex-col items-center">
          <div className="w-full rounded-4xl border-3 bg-white/90 p-6 shadow-[var(--shadow)] backdrop-blur-sm md:p-10">
            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="inline-font text-2xl font-bold md:text-3xl">
                პაროლის აღდგენა
              </h1>
              <p className="text-xs text-neutral-600 md:text-sm">
                შეიყვანე ელ. ფოსტა და გამოგიგზავნით აღდგენის ბმულს.
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

              <button
                type="submit"
                className="rounded-3xl border-2 bg-[var(--color-secondary)] py-3 text-center font-bold shadow-[var(--shadow)] transition-all duration-200 hover:bg-[var(--color-hover)]"
              >
                ბმულის გაგზავნა
              </button>
            </form>
          </div>

          <div className="mt-6 flex flex-col items-center gap-2 text-center text-xs md:text-sm">
            <Link
              href="/auth/login"
              className="font-bold text-neutral-700 hover:text-black"
            >
              დაბრუნდი შესვლის გვერდზე
            </Link>
            <p>
              არ გაქვს ანგარიში?{" "}
              <Link
                href="/auth/register"
                className="font-bold text-neutral-700 hover:text-black"
              >
                შექმენი ახლავე
              </Link>
            </p>
          </div>
        </div>
      </section>
    </AuthRoot>
  );
}
