"use client";

import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";

type Plan = {
  name: string;
  price: string | React.ReactNode;
  features: { label: React.ReactNode; ok: boolean }[];
};

const plans: Plan[] = [
  {
    name: "8 გვერდიანი წიგნი",
    price: "40₾",
    features: [
      {
        label: (
          <>
            <strong>8 გვერდიანი</strong> ფერადი კომიქსი
          </>
        ),
        ok: true,
      },
      {
        label: (
          <>
            <strong>3 რედაქტირება</strong> თითო გვერდზე
          </>
        ),
        ok: true,
      },
      {
        label: (
          <>
            <strong>უფასო მიტანა</strong> თბილისში{" "}
          </>
        ),
        ok: true,
      },
      {
        label: (
          <>
            <strong>3 სტილის</strong> არჩევა
          </>
        ),
        ok: true,
      },
      {
        label: (
          <>
            <span className="line-through">მიწოდება 24 საათში</span>
          </>
        ),
        ok: false,
      },
      {
        label: (
          <>
            <span className="line-through">ციფრული ვერსია (PDF)</span>
          </>
        ),
        ok: false,
      },
    ],
  },
  {
    name: "12 გვერდიანი წიგნი",
    price: (
      <div className="flex gap-4">
        <div className="text-green-600">50₾</div>
        <div className="line-through text-neutral-400">65₾</div>
      </div>
    ),
    features: [
      {
        label: (
          <>
            <strong>12 გვერდიანი</strong> ფერადი კომიქსი
          </>
        ),
        ok: true,
      },
      {
        label: (
          <>
            <strong>5 რედაქტირება</strong> თითო გვერდზე
          </>
        ),
        ok: true,
      },
      {
        label: (
          <>
            <strong>უფასო მიტანა</strong> თბილისში{" "}
          </>
        ),
        ok: true,
      },
      {
        label: (
          <>
            <strong>ყველა სტილის</strong> არჩევა
          </>
        ),
        ok: true,
      },
      {
        label: (
          <>
            <span className="font-bold">ციფრული ვერსია (PDF)</span>
          </>
        ),
        ok: true,
      },
      {
        label: (
          <>
            <span className="line-through">მიწოდება 24 საათში</span>
          </>
        ),
        ok: false,
      },
    ],
  },
  {
    name: "16 გვერდიანი წიგნი",
    price: (
      <div className="flex gap-4">
        <div className="text-green-600">60₾</div>
        <div className="line-through text-neutral-400">85₾</div>
      </div>
    ),
    features: [
      {
        label: (
          <>
            <strong>16 გვერდიანი</strong> ფერადი კომიქსი
          </>
        ),
        ok: true,
      },
      {
        label: (
          <>
            <strong>8 რედაქტირება</strong> თითო გვერდზე
          </>
        ),
        ok: true,
      },
      {
        label: (
          <>
            <strong>უფასო მიტანა</strong> თბილისში{" "}
          </>
        ),
        ok: true,
      },
      {
        label: (
          <>
            <strong>ყველა სტილის</strong> არჩევა
          </>
        ),
        ok: true,
      },
      {
        label: (
          <>
            <span className="font-bold">ციფრული ვერსია (PDF)</span>
          </>
        ),
        ok: true,
      },
      {
        label: (
          <>
            <span className="font-bold">მიწოდება 24 საათში</span>
          </>
        ),
        ok: true,
      },
    ],
  },
];

export default function PlanCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "center",
    skipSnaps: false,
  });

  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
  }, [emblaApi, onSelect]);

  return (
    <article id="prices-article" className="prices-article">
      <h2 className="font-semibold mb-4 inline-font flex w-full items-center justify-center py-4 md:py-12">
        ფასები
      </h2>

      {/* Embla viewport */}
      <div className="overflow-hidden xl:hidden" ref={emblaRef}>
        <div className="flex">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="flex-[0_0_85%] sm:flex-[0_0_420px] z-5"
            >
              <div className="price-card">
                <div className="effect"></div>
                <div className="tint"></div>
                <div className="shine"></div>
                <div className="relative z-3 flex flex-col gap-2">
                  <h4 className="text-[var(--color-secondary-font)]">
                    {plan.name}
                  </h4>
                  <div className="text-3xl font-semibold">{plan.price}</div>
                </div>
                <div className="relative z-3 mt-6 space-y-3">
                  {plan.features.map((f, i) => (
                    <div
                      key={`${plan.name}-${i}`}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-neutral-600">{f.label}</span>
                      <span
                        className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-base ${
                          f.ok
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-neutral-100 text-neutral-400"
                        }`}
                      >
                        {f.ok ? "✓" : "×"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dots */}
      <div className="mt-4 flex justify-center gap-2 xl:hidden bg-white  rounded-full mx-auto h-5 w-15 flex items-center">
        {plans.map((_, i) => (
          <button
            key={i}
            onClick={() => emblaApi?.scrollTo(i)}
            className={`h-2 w-2 rounded-full transition ${
              i === selectedIndex ? "bg-neutral-900" : "bg-neutral-400"
            }`}
            aria-label={`Go to plan ${i + 1}`}
          />
        ))}
      </div>

      <div className="overflow-hidden hidden xl:flex">
        <div className="flex">
          {plans.map((plan) => (
            <div key={plan.name} className="flex-[0_0_85%] sm:flex-[0_0_420px]">
              <div className="price-card">
                <div className="effect"></div>
                <div className="tint"></div>
                <div className="shine"></div>
                <div className="relative z-3 flex flex-col gap-2">
                  <h4 className="text-[var(--color-secondary-font)]">
                    {plan.name}
                  </h4>
                  <div className="text-3xl font-semibold">{plan.price}</div>
                </div>
                <div className="relative z-3 mt-6 space-y-3">
                  {plan.features.map((f, i) => (
                    <div
                      key={`${plan.name}-${i}`}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-neutral-600">{f.label}</span>
                      <span
                        className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-base ${
                          f.ok
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-neutral-100 text-neutral-400"
                        }`}
                      >
                        {f.ok ? "✓" : "×"}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="price-action-div relative z-3">
                  <a className="price-action-button my-6 md:mt-12" href="/">
                    შეუკვეთე
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
