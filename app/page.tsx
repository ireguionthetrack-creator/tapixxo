import Image from "next/image";
import { connection } from "next/server";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  ChartHistogramIcon,
  DiamondIcon,
  Dumbbell01Icon,
  Hotel01Icon,
  Link01Icon,
  NfcIcon,
  RestaurantIcon,
  ScissorIcon,
  Settings01Icon,
  Shield01Icon,
  SmartPhone01Icon,
  SparklesIcon,
  StarIcon,
} from "@hugeicons/core-free-icons";
import { LiquidGlass } from "./components/liquid-glass";
import { LandingNav } from "./components/landing-nav";
import { ScrollReveal } from "./components/scroll-reveal";
import { TapixxoBrand } from "./components/tapixxo-brand";
import { createAdminClient } from "@/lib/supabase/admin";

const benefits = [
  {
    icon: "star",
    title: "Más reseñas y reputación",
    copy: "Facilita que tus clientes te califiquen en Google, TripAdvisor y más.",
  },
  {
    icon: "chart",
    title: "Estadísticas en tiempo real",
    copy: "Conoce cuántos escaneos tienes y qué enlace funciona mejor.",
  },
  {
    icon: "settings",
    title: "100% personalizable",
    copy: "Cada placa es única y puedes cambiar su destino cuando quieras.",
  },
  {
    icon: "shield",
    title: "Diseño premium",
    copy: "Minimalista, elegante y resistente. Hecha para durar.",
  },
];

const steps = [
  ["phone", "Acerca o escanea", "Tu cliente usa su celular con NFC o QR."],
  ["link", "Se abre tu enlace", "Lo llevas directo a Google, TripAdvisor o donde quieras."],
  ["star", "Deja su reseña", "Una experiencia simple y rápida."],
  ["chart", "Tú ves los resultados", "Todo queda registrado en tu panel."],
];

const useCases = [
  ["Restaurantes", "restaurant", "/images/tapixxo-use-restaurant.png"],
  ["Gimnasios", "gym", "/images/tapixxo-use-gym.png"],
  ["Peluquerías", "salon", "/images/tapixxo-use-salon.png"],
  ["Hoteles", "hotel", "/images/tapixxo-use-hotel.png"],
];

type IconName = "star" | "chart" | "settings" | "shield" | "phone" | "link" | "restaurant" | "gym" | "salon" | "hotel" | "nfc" | "sparkle" | "diamond";

const massiveIcons: Record<IconName, IconSvgElement> = {
  star: StarIcon,
  chart: ChartHistogramIcon,
  settings: Settings01Icon,
  shield: Shield01Icon,
  phone: SmartPhone01Icon,
  link: Link01Icon,
  restaurant: RestaurantIcon,
  gym: Dumbbell01Icon,
  salon: ScissorIcon,
  hotel: Hotel01Icon,
  nfc: NfcIcon,
  sparkle: SparklesIcon,
  diamond: DiamondIcon,
};

function LineIcon({ name }: { name: IconName }) {
  return <HugeiconsIcon icon={massiveIcons[name]} size="1em" strokeWidth={1.7} aria-hidden="true" focusable="false" />;
}

function ArrowIcon() {
  return <HugeiconsIcon icon={ArrowRight01Icon} size="1em" strokeWidth={1.7} aria-hidden="true" focusable="false" />;
}

type SocialProofCompany = {
  id: string;
  name: string;
  profile_image_path: string | null;
};

async function getSocialProofCompanies() {
  await connection();

  try {
    const supabase = createAdminClient();
    const result = await supabase
      .from("companies")
      .select("id, name, profile_image_path", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(5);

    if (!result.error) {
      return {
        companies: (result.data ?? []) as SocialProofCompany[],
        count: result.count ?? 0,
      };
    }

    if (result.error.code === "42703") {
      const fallback = await supabase
        .from("companies")
        .select("id, name", { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(5);

      return {
        companies: (fallback.data ?? []).map((company) => ({
          ...company,
          profile_image_path: null,
        })),
        count: fallback.count ?? 0,
      };
    }
  } catch {
    // The landing remains available while the company service is unavailable.
  }

  return { companies: [], count: 0 };
}

type LandingMetrics = {
  companies: number;
  scans: number;
};

async function getLandingMetrics(): Promise<LandingMetrics> {
  await connection();

  try {
    const supabase = createAdminClient();
    const [companies, scans] = await Promise.all([
      supabase.from("companies").select("id", { count: "exact", head: true }),
      supabase.from("code_scans").select("id", { count: "exact", head: true }),
    ]);

    return {
      companies: companies.error ? 0 : companies.count ?? 0,
      scans: scans.error ? 0 : scans.count ?? 0,
    };
  } catch {
    // Live metrics must not make the landing unavailable.
    return { companies: 0, scans: 0 };
  }
}

const metricFormatter = new Intl.NumberFormat("es-CO");

function getCompanyAvatarUrl(imagePath: string | null) {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!baseUrl || !imagePath) return null;

  return `${baseUrl}/storage/v1/object/public/company-avatars/${imagePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

export default async function Home() {
  const [socialProof, metrics] = await Promise.all([
    getSocialProofCompanies(),
    getLandingMetrics(),
  ]);
  const companyLabel = metrics.companies === 1 ? "negocio" : "negocios";

  return (
    <main className="tapixxo-landing">
      <section className="tapixxo-showcase-hero" aria-labelledby="hero-title">
        <Image
          src="/images/tapixxo-hero-plaque-wide.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="tapixxo-showcase-backdrop"
        />
        <div className="tapixxo-showcase-backdrop-shade" aria-hidden="true" />

        <LandingNav />

        <div className="tapixxo-landing-wrap tapixxo-showcase-hero-grid" id="inicio">
          <div className="tapixxo-showcase-copy">
            <LiquidGlass
              className="tapixxo-srdavo-surface tapixxo-srdavo-kicker-surface"
              radius={999}
              depth={2}
              blur={2}
              strength={42}
              backgroundColor="rgba(20, 18, 16, 0.36)"
            >
              <p className="tapixxo-showcase-kicker">NFC · QR · Experiencias reales</p>
            </LiquidGlass>
            <h1 id="hero-title">Conecta experiencias <span>reales.</span></h1>
            <p className="tapixxo-showcase-lede">
              Placas NFC y QR para convertir una visita en una reseña, una conversación o el siguiente paso de tu marca.
            </p>
            <div className="tapixxo-showcase-actions">
              <LiquidGlass className="tapixxo-srdavo-surface tapixxo-srdavo-control tapixxo-srdavo-control-warm tapixxo-login-control" radius={21} strength={50} backgroundColor="rgba(255, 112, 38, 0.78)">
                <a className="tapixxo-liquid-button tapixxo-liquid-button-primary tapixxo-login-button" href="/login">
                  Iniciar sesión
                </a>
              </LiquidGlass>
              <LiquidGlass className="tapixxo-srdavo-surface tapixxo-srdavo-control" radius={21} strength={50} backgroundColor="rgba(22, 22, 21, 0.34)">
                <a className="tapixxo-liquid-button tapixxo-liquid-button-quiet" href="#como-funciona">
                  Ver cómo funciona
                </a>
              </LiquidGlass>
            </div>
            <div className="tapixxo-showcase-social-proof" aria-label={`${metrics.companies} ${companyLabel} que usan Tapixxo`}>
              <div className="tapixxo-showcase-avatars" aria-label="Empresas registradas recientemente">
                {socialProof.companies.map((company, index) => {
                  const avatarUrl = getCompanyAvatarUrl(company.profile_image_path);

                  return (
                    <span className="tapixxo-showcase-avatar" key={company.id} style={{ animationDelay: `${index * -1.15}s` }} aria-hidden="true">
                      {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage URL is dynamic.
                        <img src={avatarUrl} alt="" />
                      ) : (
                        <span className="tapixxo-showcase-avatar-fallback" />
                      )}
                    </span>
                  );
                })}
              </div>
              <p><strong>{metrics.companies} {companyLabel}</strong><span>ya activan experiencias con Tapixxo.</span></p>
            </div>
          </div>
        </div>

        <LiquidGlass
          className="tapixxo-srdavo-surface tapixxo-showcase-outcome-surface"
          radius={22}
          depth={3}
          blur={3}
          strength={50}
          backgroundColor="rgba(19, 17, 15, 0.42)"
        >
          <aside className="tapixxo-showcase-outcome" aria-label="Resultados que impulsa Tapixxo">
            <p>Impacto que se nota</p>
            <strong>Más reseñas</strong>
            <strong>Más clientes</strong>
            <strong>Más rendimiento</strong>
          </aside>
        </LiquidGlass>
      </section>

      <section className="tapixxo-showcase-benefits" id="beneficios" aria-label="Beneficios de Tapixxo">
        <ScrollReveal className="tapixxo-landing-wrap">
          <div className="tapixxo-showcase-benefit-grid">
            {benefits.map((benefit) => (
              <LiquidGlass
                className="tapixxo-srdavo-surface tapixxo-showcase-benefit-surface"
                key={benefit.title}
                radius={18}
                depth={3}
                blur={3}
                strength={48}
                backgroundColor="rgba(33, 29, 26, 0.46)"
              >
                <article className="tapixxo-showcase-benefit">
                  <span className="tapixxo-showcase-feature-icon"><LineIcon name={benefit.icon as IconName} /></span>
                  <h3>{benefit.title}</h3>
                  <span>{benefit.copy}</span>
                </article>
              </LiquidGlass>
            ))}
          </div>
        </ScrollReveal>
      </section>

      <section className="tapixxo-showcase-product" id="producto" aria-labelledby="product-title">
        <ScrollReveal className="tapixxo-landing-wrap tapixxo-showcase-product-panel">
          <div className="tapixxo-showcase-product-intro">
            <h2 id="product-title">Un producto, infinitas posibilidades</h2>
            <p>
              Tapixxo se adapta a restaurantes, hoteles, estudios, comercios y servicios que quieren acercar su mundo digital de una forma más natural.
            </p>
          </div>
          <div className="tapixxo-showcase-use-cases" aria-label="Casos de uso">
            {useCases.map(([label, icon, image]) => (
              <article className="tapixxo-showcase-use-case" key={label}>
                <Image src={image} alt={`Placa Tapixxo en ${label.toLowerCase()}`} fill sizes="(max-width: 767px) 50vw, 25vw" />
                <div><LineIcon name={icon as IconName} /><span>{label}</span></div>
              </article>
            ))}
          </div>
        </ScrollReveal>
      </section>

      <section className="tapixxo-showcase-steps" id="como-funciona" aria-labelledby="steps-title">
        <ScrollReveal className="tapixxo-landing-wrap tapixxo-showcase-steps-panel">
          <div className="tapixxo-showcase-steps-heading">
            <h2 id="steps-title">Cómo funciona</h2>
            <p>Simple para tus clientes.<br />Potente para tu negocio.</p>
          </div>
          <div className="tapixxo-showcase-step-grid">
            {steps.map(([icon, title, copy], index) => (
              <article key={title}>
                <span className="tapixxo-showcase-step-icon"><LineIcon name={icon as IconName} /></span>
                <h3>{title}</h3>
                <span>{copy}</span>
                {index < steps.length - 1 && <span className="tapixxo-showcase-step-arrow"><ArrowIcon /></span>}
              </article>
            ))}
          </div>
        </ScrollReveal>
      </section>

      <section className="tapixxo-product-design" id="placa" aria-labelledby="product-design-title">
        <ScrollReveal className="tapixxo-landing-wrap">
          <div className="tapixxo-product-design-panel">
            <div className="tapixxo-product-design-visual" aria-hidden="true">
              <Image src="/images/tapixxo-product-feature.png" alt="" fill sizes="(max-width: 767px) 100vw, 96rem" priority={false} />
            </div>
            <div className="tapixxo-product-design-copy">
              <h2 id="product-design-title">Diseñado para <span>el mundo real</span></h2>
              <p>Materiales de alta calidad, acabado premium y un diseño minimalista que se adapta a cualquier espacio. Tecnología invisible, impacto real.</p>
              <a className="tapixxo-product-design-cta" href="#contacto">Conoce el producto <ArrowIcon /></a>
              <ul aria-label="Características de la placa Tapixxo">
                <li><LineIcon name="nfc" /><span>NFC + QR</span></li>
                <li><LineIcon name="shield" /><span>Resistente</span></li>
                <li><LineIcon name="sparkle" /><span>Larga vida útil</span></li>
                <li><LineIcon name="diamond" /><span>Diseño elegante</span></li>
              </ul>
            </div>
            <dl className="tapixxo-product-design-specs">
              <div><dt>100 mm</dt><dd>Alto</dd></div>
              <div><dt>76 mm</dt><dd>Ancho</dd></div>
              <div><dt>40 mm</dt><dd>Profundidad</dd></div>
            </dl>
          </div>
          <div className="tapixxo-product-metrics" aria-label="Tapixxo en cifras">
            <TapixxoBrand className="tapixxo-product-metrics-brand" />
            <span className="tapixxo-product-metrics-copy">Tecnología simple.<br />Resultados extraordinarios.</span>
            <span><strong>{metricFormatter.format(metrics.companies)}</strong><small>Negocios</small></span>
            <span><strong>{metricFormatter.format(metrics.scans)}</strong><small>Escaneos</small></span>
            <span><strong aria-label="Calificación promedio sin datos vinculados">—</strong><small>Calificación promedio</small></span>
          </div>
        </ScrollReveal>
      </section>

      <section className="tapixxo-showcase-close" id="precios" aria-labelledby="contact-title">
        <ScrollReveal className="tapixxo-landing-wrap tapixxo-showcase-close-panel">
          <div>
            <p className="tapixxo-landing-kicker">Tapixxo para tu negocio</p>
            <h2 id="contact-title">Haz que cada visita llegue más lejos.</h2>
          </div>
          <div className="tapixxo-showcase-contact-actions" id="contacto">
            <LiquidGlass className="tapixxo-srdavo-surface tapixxo-srdavo-control tapixxo-srdavo-control-warm" radius={21} strength={50} backgroundColor="rgba(255, 112, 38, 0.78)">
              <a className="tapixxo-liquid-button tapixxo-liquid-button-primary" href="https://wa.me/573016728011" target="_blank" rel="noreferrer">
                WhatsApp
              </a>
            </LiquidGlass>
            <LiquidGlass className="tapixxo-srdavo-surface tapixxo-srdavo-control" radius={21} strength={46} backgroundColor="rgba(31, 25, 21, 0.52)">
              <a className="tapixxo-liquid-button tapixxo-liquid-button-quiet" href="mailto:hola@tapixxo.com?subject=Quiero%20cotizar%20Tapixxo">
                hola@tapixxo.com
              </a>
            </LiquidGlass>
          </div>
        </ScrollReveal>
      </section>

      <footer className="tapixxo-showcase-footer">
        <div className="tapixxo-landing-wrap">
          <TapixxoBrand />
          <span>Tapixxo · Tecnología que conecta personas.</span>
          <span>© {new Date().getFullYear()} Tapixxo</span>
        </div>
      </footer>
    </main>
  );
}
