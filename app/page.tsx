import Link from "next/link";
import { TapixxoBrand } from "@/app/components/tapixxo-brand";

export default function HomePage() {
  return (
    <main className="tapixxo-shell min-h-screen text-white">

      {/* NAVBAR */}

      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8">

          <Link href="/" aria-label="Tapixxo">
            <TapixxoBrand priority />
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/store"
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-300 transition hover:bg-white/5 hover:text-white"
            >
              Store
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-white/15 px-3.5 py-2 text-sm font-medium text-white transition hover:border-white/30 hover:bg-white/5 sm:px-5 sm:py-2.5"
            >
              Iniciar sesión
            </Link>
          </div>

        </div>
      </header>


      {/* HERO */}

      <section className="relative overflow-hidden">

        <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-orange-500/10 blur-[140px]" />

        <div className="relative mx-auto max-w-7xl px-6 pb-28 pt-24 lg:px-8 lg:pb-36 lg:pt-32">

          <div className="max-w-4xl">

            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-gray-400">

              <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />

              Tecnología de conexión inteligente

            </div>

            <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">

              Conecta lo físico

              <br />

              con lo{" "}
              <span className="text-gray-500">
                digital.
              </span>

            </h1>

            <p className="mt-8 max-w-2xl text-lg leading-8 text-gray-400">

              Tapixxo convierte cada punto físico en una
              puerta hacia tu mundo digital. Una experiencia
              simple, rápida y diseñada para conectar personas
              con contenido en un instante.

            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">

              <Link
                href="/login"
                className="rounded-xl bg-orange-400 px-6 py-3.5 text-center font-semibold text-black transition hover:bg-orange-300 hover:shadow-[0_0_28px_rgba(255,122,26,0.25)]"
              >
                Acceder al panel
              </Link>

              <a
                href="#como-funciona"
                className="rounded-lg border border-white/15 px-6 py-3.5 text-center font-medium text-white transition hover:border-white/30 hover:bg-white/5"
              >
                Conocer Tapixxo
              </a>

            </div>

          </div>

        </div>

      </section>


      {/* SEPARADOR */}

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="h-px bg-white/10" />
      </div>


      {/* COMO FUNCIONA */}

      <section
        id="como-funciona"
        className="mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32"
      >

        <div className="max-w-2xl">

          <p className="text-sm font-medium uppercase tracking-[0.2em] text-orange-500">
            Cómo funciona
          </p>

          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Simple para todos.
          </h2>

          <p className="mt-5 text-gray-400">
            Tapixxo está diseñado para que la tecnología
            desaparezca y solo quede la experiencia.
          </p>

        </div>


        <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-3">

              <div className="bg-black/45 p-8">

            <span className="text-sm text-gray-600">
              01
            </span>

            <h3 className="mt-8 text-xl font-semibold">
              Acerca
            </h3>

            <p className="mt-4 leading-7 text-gray-400">
              El usuario encuentra un código Tapixxo
              en un espacio físico.
            </p>

          </div>


              <div className="bg-black/45 p-8">

            <span className="text-sm text-gray-600">
              02
            </span>

            <h3 className="mt-8 text-xl font-semibold">
              Escanea
            </h3>

            <p className="mt-4 leading-7 text-gray-400">
              Un simple escaneo conecta inmediatamente
              el punto físico con su destino digital.
            </p>

          </div>


              <div className="bg-black/45 p-8">

            <span className="text-sm text-gray-600">
              03
            </span>

            <h3 className="mt-8 text-xl font-semibold">
              Conecta
            </h3>

            <p className="mt-4 leading-7 text-gray-400">
              La experiencia continúa en el contenido
              que cada empresa haya configurado.
            </p>

          </div>

        </div>

      </section>


      {/* PARA EMPRESAS */}

      <section className="border-y border-white/10 bg-white/[0.02]">

        <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32">

          <div className="grid gap-16 md:grid-cols-2 md:items-center">

            <div>

              <p className="text-sm font-medium uppercase tracking-[0.2em] text-orange-500">
                Para empresas
              </p>

              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Tu contenido.
                <br />
                Tu control.
              </h2>

              <p className="mt-6 max-w-xl leading-7 text-gray-400">
                Administra tus destinos digitales desde un
                único lugar y modifica tus enlaces cuando
                lo necesites.
              </p>

            </div>


            <div className="grid gap-4 sm:grid-cols-2">

              <div className="rounded-2xl border border-white/10 bg-black p-6">

                <div className="mb-5 text-2xl">
                  ↗
                </div>

                <h3 className="font-semibold">
                  Enlaces dinámicos
                </h3>

                <p className="mt-3 text-sm leading-6 text-gray-500">
                  Cambia el destino sin tener que reemplazar
                  el código físico.
                </p>

              </div>


              <div className="rounded-2xl border border-white/10 bg-black p-6">

                <div className="mb-5 text-2xl">
                  ◉
                </div>

                <h3 className="font-semibold">
                  Estadísticas
                </h3>

                <p className="mt-3 text-sm leading-6 text-gray-500">
                  Consulta el rendimiento de tus códigos.
                </p>

              </div>


              <div className="rounded-2xl border border-white/10 bg-black p-6">

                <div className="mb-5 text-2xl">
                  #
                </div>

                <h3 className="font-semibold">
                  Organización
                </h3>

                <p className="mt-3 text-sm leading-6 text-gray-500">
                  Organiza tus códigos mediante grupos.
                </p>

              </div>


              <div className="rounded-2xl border border-white/10 bg-black p-6">

                <div className="mb-5 text-2xl">
                  ✓
                </div>

                <h3 className="font-semibold">
                  Siempre disponible
                </h3>

                <p className="mt-3 text-sm leading-6 text-gray-500">
                  Actualiza los destinos sin reemplazar
                  los códigos físicos.
                </p>

              </div>

            </div>

          </div>

        </div>

      </section>


      {/* CTA */}

      <section className="mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32">

        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] px-8 py-16 text-center sm:px-16">

          <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-orange-500/10 blur-[100px]" />

          <div className="relative">

            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              El mundo físico tiene
              <br />
              mucho más que decir.
            </h2>

            <p className="mx-auto mt-5 max-w-xl text-gray-400">
              Tapixxo crea el puente entre ambos mundos.
            </p>

              <Link
                href="/login"
                className="mt-8 inline-flex rounded-xl bg-orange-400 px-6 py-3.5 font-semibold text-black transition hover:bg-orange-300 hover:shadow-[0_0_28px_rgba(255,122,26,0.25)]"
            >
              Entrar a Tapixxo
            </Link>

          </div>

        </div>

      </section>


      {/* FOOTER */}

      <footer className="border-t border-white/10">

        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">

          <p>
            © {new Date().getFullYear()} Tapixxo
          </p>

          <p>
            Conectando lo físico con lo digital.
          </p>

        </div>

      </footer>

    </main>
  );
}
