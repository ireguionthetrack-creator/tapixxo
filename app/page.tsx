import Link from "next/link";
import { StoreHeader } from "@/app/components/store-header";

export default function HomePage() {
  return (
    <main className="tapixxo-shell min-h-screen text-white">

      <StoreHeader />


      {/* HERO */}

      <section className="tapixxo-home-hero relative overflow-hidden">
        <div className="tapixxo-hero-glow pointer-events-none absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-orange-500/10 blur-[140px]" />
        <div className="tapixxo-grid pointer-events-none absolute inset-0 opacity-50 [mask-image:linear-gradient(to_bottom,black,transparent_82%)]" />

        <div className="relative mx-auto grid max-w-7xl gap-14 px-5 pb-24 pt-16 sm:px-6 sm:pt-24 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:gap-10 lg:px-8 lg:pb-36 lg:pt-28">
          <div className="max-w-3xl">
            <div className="tapixxo-chip tapixxo-enter mb-7 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-gray-300">
              <span className="tapixxo-pulse h-1.5 w-1.5 rounded-full bg-orange-400" />
              Tecnología de conexión inteligente
            </div>

            <h1 className="tapixxo-display tapixxo-enter tapixxo-enter-delay-1 text-5xl font-semibold sm:text-6xl lg:text-7xl">
              Conecta lo físico
              <br />
              con lo <span className="tapixxo-hero-word text-gray-400">digital.</span>
            </h1>

            <p className="tapixxo-enter tapixxo-enter-delay-2 mt-7 max-w-2xl text-base leading-7 text-gray-400 sm:text-lg sm:leading-8">
              Tapixxo convierte cada punto físico en una puerta hacia tu mundo digital. Una experiencia simple, rápida y diseñada para conectar personas con contenido en un instante.
            </p>

            <div className="tapixxo-enter tapixxo-enter-delay-3 mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="tapixxo-button-primary rounded-2xl bg-orange-400 px-6 py-3.5 text-center font-semibold text-black transition hover:bg-orange-300"
              >
                Acceder al panel <span aria-hidden="true">→</span>
              </Link>

              <a
                href="#como-funciona"
                className="rounded-2xl border border-white/15 bg-white/[0.045] px-6 py-3.5 text-center font-medium text-white shadow-[inset_0_1px_rgba(255,255,255,0.1)] transition hover:border-orange-300/40 hover:bg-white/[0.09]"
              >
                Conocer Tapixxo
              </a>
            </div>

            <div className="tapixxo-enter tapixxo-enter-delay-3 mt-9 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-500">
              <span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-orange-300/90" /> Un toque. Un destino.</span>
              <span className="hidden h-4 w-px bg-white/15 sm:block" />
              <span>Actualiza cuando quieras.</span>
            </div>
          </div>

          <div className="tapixxo-hero-stage tapixxo-enter tapixxo-enter-delay-2 mx-auto w-full max-w-[29rem]" aria-hidden="true">
            <div className="tapixxo-hero-orbit tapixxo-hero-orbit-one" />
            <div className="tapixxo-hero-orbit tapixxo-hero-orbit-two" />
            <div className="tapixxo-hero-orbit tapixxo-hero-orbit-three" />
            <div className="tapixxo-hero-plate">
              <div className="tapixxo-hero-plate-shine" />
              <div className="relative flex h-full flex-col justify-between p-6 sm:p-8">
                <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.2em] text-gray-400">
                  <span>Tapixxo</span>
                  <span className="flex items-center gap-1.5 text-orange-200"><span className="h-1.5 w-1.5 rounded-full bg-orange-300" /> Activo</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="tapixxo-nfc-mark">
                    <span className="tapixxo-nfc-ring tapixxo-nfc-ring-one" />
                    <span className="tapixxo-nfc-ring tapixxo-nfc-ring-two" />
                    <svg viewBox="0 0 24 24" className="relative z-10 h-10 w-10 fill-none stroke-white stroke-[1.35]"><path d="M8.1 8.1a5.5 5.5 0 0 1 7.78 0M5.27 5.27a9.5 9.5 0 0 1 13.46 0M10.93 10.93a1.5 1.5 0 0 1 2.14 0M12 14.5v.01" strokeLinecap="round" /></svg>
                  </div>
                  <p className="mt-5 text-lg font-medium tracking-[0.12em] text-white">TAPIXXO</p>
                  <p className="mt-1 text-xs text-gray-400">Acerca tu celular</p>
                </div>
                <div className="flex items-end justify-between">
                  <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[10px] text-gray-300">NFC + QR</span>
                  <span className="font-mono text-xs tracking-[0.14em] text-gray-400">T • 1000</span>
                </div>
              </div>
            </div>
            <div className="tapixxo-hero-float-card tapixxo-hero-float-top"><span className="text-orange-200">↗</span><span>Destino actualizado</span></div>
            <div className="tapixxo-hero-float-card tapixxo-hero-float-bottom"><span className="tapixxo-pulse h-2 w-2 rounded-full bg-emerald-300" /><span>Listo para conectar</span></div>
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


        <div className="mt-12 grid gap-4 md:mt-16 md:grid-cols-3">

              <div className="tapixxo-glass-card tapixxo-enter p-7 sm:p-8">

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


              <div className="tapixxo-glass-card tapixxo-enter tapixxo-enter-delay-1 p-7 sm:p-8">

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


              <div className="tapixxo-glass-card tapixxo-enter tapixxo-enter-delay-2 p-7 sm:p-8">

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

      <section className="border-y border-white/10 bg-white/[0.025] backdrop-blur-sm">

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

              <div className="tapixxo-glass-card p-6">

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


              <div className="tapixxo-glass-card p-6">

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


              <div className="tapixxo-glass-card p-6">

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


              <div className="tapixxo-glass-card p-6">

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

        <div className="tapixxo-liquid-cta relative rounded-3xl px-6 py-14 text-center sm:px-16 sm:py-16">

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
                className="tapixxo-button-primary mt-8 inline-flex rounded-2xl bg-orange-400 px-6 py-3.5 font-semibold text-black transition hover:bg-orange-300"
            >
              Entrar a Tapixxo
            </Link>

          </div>

        </div>

      </section>


      {/* CONTACTO */}

      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-6 lg:px-8 lg:pb-28">
        <div className="tapixxo-panel relative overflow-hidden rounded-3xl border border-white/[0.12] px-5 py-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.16),0_24px_60px_rgba(0,0,0,0.22)] sm:px-8 sm:py-10">
          <div className="pointer-events-none absolute right-0 top-1/2 h-52 w-52 -translate-y-1/2 rounded-full bg-orange-400/[0.09] blur-[90px]" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-orange-300">Contacto</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Hablemos.</h2>
              <p className="mt-2 text-sm text-gray-400 sm:text-base">Estamos aquí para ayudarte a conectar mejor.</p>
            </div>

            <div className="grid gap-2 sm:min-w-[320px]">
              <a
                href="mailto:hola@tapixxo.com"
                className="group flex min-h-12 items-center gap-3 rounded-2xl border border-white/[0.12] bg-white/[0.055] px-4 text-sm text-gray-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-orange-300/45 hover:bg-white/[0.09] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/70"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-300/[0.12] text-orange-200 transition group-hover:bg-orange-300/[0.2]">
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]"><path d="M3.75 6.75 12 12.75l8.25-6M5.25 18.75h13.5a1.5 1.5 0 0 0 1.5-1.5v-10.5a1.5 1.5 0 0 0-1.5-1.5H5.25a1.5 1.5 0 0 0-1.5 1.5v10.5a1.5 1.5 0 0 0 1.5 1.5Z" /></svg>
                </span>
                <span className="min-w-0 flex-1 truncate">Hola@tapixxo.com</span>
                <span aria-hidden="true" className="text-gray-500 transition group-hover:translate-x-0.5 group-hover:text-orange-200">↗</span>
              </a>
              <a
                href="tel:+573016728011"
                className="group flex min-h-12 items-center gap-3 rounded-2xl border border-white/[0.12] bg-white/[0.055] px-4 text-sm text-gray-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-orange-300/45 hover:bg-white/[0.09] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/70"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-300/[0.12] text-orange-200 transition group-hover:bg-orange-300/[0.2]">
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]"><path d="M6.62 10.79a15.46 15.46 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.32.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.61 21 3 13.39 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.24 1.02l-2.21 2.2Z" /></svg>
                </span>
                <span className="min-w-0 flex-1">+57 301 672 8011</span>
                <span aria-hidden="true" className="text-gray-500 transition group-hover:translate-x-0.5 group-hover:text-orange-200">↗</span>
              </a>
            </div>
          </div>
        </div>
      </section>


      {/* FOOTER */}

      <footer className="tapixxo-nav-glass border-t border-white/10">

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
