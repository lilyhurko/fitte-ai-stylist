import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Compass } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  return (
    <main
      className="flex min-h-[60vh] w-full items-center justify-center bg-fitte-cream p-6"
      aria-labelledby="not-found-heading"
    >
      <section className="w-full max-w-xl rounded-[28px] border border-fitte-sand bg-white p-8 text-center shadow-sm md:p-12">
        <Compass
          size={42}
          className="mx-auto mb-5 text-fitte-terracotta"
          aria-hidden="true"
        />

        <p className="mb-2 text-xs font-bold tracking-[0.18em] text-fitte-terracotta">
          BŁĄD 404
        </p>

        <h1
          id="not-found-heading"
          className="font-playfair text-3xl text-fitte-brown-dark md:text-4xl"
        >
          Nie znaleźliśmy tej strony
        </h1>

        <p className="mt-4 text-sm leading-relaxed text-gray-500">
          Adres{" "}
          <span className="font-medium text-fitte-brown-dark">
            {location.pathname}
          </span>{" "}
          nie prowadzi do strony w aplikacji Fitte.
        </p>

        <Link
          to="/"
          className="mt-7 inline-flex items-center gap-2 rounded-xl bg-fitte-brown-dark px-5 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-fitte-terracotta focus:ring-offset-2"
        >
          <ArrowLeft size={17} aria-hidden="true" />
          Wróć na stronę główną
        </Link>
      </section>
    </main>
  );
};

export default NotFound;
