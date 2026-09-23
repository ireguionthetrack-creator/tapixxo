"use client";

import Image from "next/image";
import Link from "next/link";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { detectTexasLanguage, isTexasLanguage, TEXAS_LANGUAGE_OPTIONS, type TexasLanguage } from "@/lib/digital-menu/presentations/texas/translations";
import styles from "./texas-multilink.module.css";

const TEXAS_MULTILINK_COPY: Record<TexasLanguage, {
  tagline: string;
  menu: string;
  reservation: string;
  reservationTitle: string;
  reservationIntro: string;
  people: string;
  date: string;
  time: string;
  selectPeople: string;
  selectTime: string;
  sendReservation: string;
  closeReservation: string;
  whatsapp: string;
  socials: string;
  language: string;
  selectLanguage: string;
  instagram: string;
  facebook: string;
}> = {
  es: { tagline: "Sabores que se viven. Noches para recordar.", menu: "Ver menú", reservation: "Hacer reserva", reservationTitle: "Haz tu reserva", reservationIntro: "Elige los detalles y te llevamos a WhatsApp para confirmarla.", people: "Personas", date: "Fecha", time: "Hora", selectPeople: "Cantidad de personas", selectTime: "Selecciona una hora", sendReservation: "Continuar por WhatsApp", closeReservation: "Cerrar reserva", whatsapp: "Escríbenos a WhatsApp", socials: "Síguenos", language: "Cambiar idioma", selectLanguage: "Seleccionar idioma", instagram: "Instagram de Texas Resto Bar", facebook: "Facebook de Texas Resto Bar" },
  en: { tagline: "Flavors to live. Nights to remember.", menu: "View menu", reservation: "Make a reservation", reservationTitle: "Make a reservation", reservationIntro: "Choose the details and we will take you to WhatsApp to confirm it.", people: "Guests", date: "Date", time: "Time", selectPeople: "Number of guests", selectTime: "Choose a time", sendReservation: "Continue on WhatsApp", closeReservation: "Close reservation", whatsapp: "Message us on WhatsApp", socials: "Follow us", language: "Change language", selectLanguage: "Select language", instagram: "Texas Resto Bar on Instagram", facebook: "Texas Resto Bar on Facebook" },
  pt: { tagline: "Sabores para viver. Noites para lembrar.", menu: "Ver cardápio", reservation: "Fazer reserva", reservationTitle: "Faça sua reserva", reservationIntro: "Escolha os detalhes e levaremos você ao WhatsApp para confirmá-la.", people: "Pessoas", date: "Data", time: "Horário", selectPeople: "Número de pessoas", selectTime: "Escolha um horário", sendReservation: "Continuar no WhatsApp", closeReservation: "Fechar reserva", whatsapp: "Fale conosco pelo WhatsApp", socials: "Siga-nos", language: "Mudar idioma", selectLanguage: "Selecionar idioma", instagram: "Instagram do Texas Resto Bar", facebook: "Facebook do Texas Resto Bar" },
  fr: { tagline: "Des saveurs à vivre. Des nuits à retenir.", menu: "Voir le menu", reservation: "Réserver", reservationTitle: "Réservez votre table", reservationIntro: "Choisissez les détails et nous vous dirigerons vers WhatsApp pour la confirmer.", people: "Personnes", date: "Date", time: "Heure", selectPeople: "Nombre de personnes", selectTime: "Choisissez une heure", sendReservation: "Continuer sur WhatsApp", closeReservation: "Fermer la réservation", whatsapp: "Écrivez-nous sur WhatsApp", socials: "Suivez-nous", language: "Changer de langue", selectLanguage: "Choisir la langue", instagram: "Instagram de Texas Resto Bar", facebook: "Facebook de Texas Resto Bar" },
};

const WHATSAPP_URL = "https://api.whatsapp.com/send/?app_absent=0&phone=573175000009&text=Hola%20Texas%20Resto%20Bar%2C%20quiero%20m%C3%A1s%20informaci%C3%B3n.";
const WHATSAPP_RESERVATION_URL = "https://api.whatsapp.com/send/?app_absent=0&phone=573175000009&text=";
const RESERVATION_HOURS = Array.from({ length: 12 }, (_, index) => `${String(index + 12).padStart(2, "0")}:00`);

function currentLocalDate() {
  const now = new Date();
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, 10);
}

function MenuIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5h14M5 12h14M5 19.5h14" /></svg>;
}

function CalendarIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M7.5 3.5v4M16.5 3.5v4M3.5 10h17M8 14h3M13 14h3" /></svg>;
}

function WhatsAppIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 11.6a8.4 8.4 0 0 1-12.4 7.4L3.5 20.5 5 15.9a8.4 8.4 0 1 1 15.5-4.3Z" /><path d="M8.2 7.8c.3-.7.6-.7.9-.7h.5c.2 0 .4.1.5.4l.8 1.9c.1.3.1.5-.1.7l-.5.6c-.1.1-.2.3-.1.5.5 1 1.3 1.8 2.3 2.3.2.1.4.1.5-.1l.6-.7c.2-.2.4-.2.7-.1l1.8.9c.3.1.4.3.4.5 0 .4-.2 1.1-.7 1.4-.5.3-1.2.4-2 .2-1.2-.4-2.6-1.4-3.7-2.6-1-1.1-1.9-2.5-2.2-3.7-.2-.8-.1-1.4.1-1.8Z" /></svg>;
}

function GlobeIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M3.8 12h16.4M12 3.5c2.2 2.3 3.2 5.1 3.2 8.5S14.2 18.2 12 20.5C9.8 18.2 8.8 15.4 8.8 12S9.8 5.8 12 3.5Z" /></svg>;
}

function InstagramIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="4.5" /><circle cx="12" cy="12" r="3.7" /><path d="M17.5 6.8h.01" /></svg>;
}

function FacebookIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 20v-7h2.7l.4-3h-3.1V8.1c0-.9.2-1.5 1.5-1.5h1.7V3.9c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3V10H7.2v3H10v7h3.5Z" /></svg>;
}

export function TexasMultiLink({ onViewMenu, enabledLanguages = ["es", "en", "pt", "fr"] }: { onViewMenu?: () => void; enabledLanguages?: readonly TexasLanguage[] }) {
  const [language, setLanguage] = useState<TexasLanguage>("es");
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [isReservationOpen, setIsReservationOpen] = useState(false);
  const [reservationPartySize, setReservationPartySize] = useState("2");
  const [reservationDate, setReservationDate] = useState(currentLocalDate);
  const [reservationTime, setReservationTime] = useState("12:00");
  const languageRef = useRef<HTMLDivElement>(null);
  const reservationCloseRef = useRef<HTMLButtonElement>(null);
  const copy = TEXAS_MULTILINK_COPY[language];

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const stored = window.localStorage.getItem("tapixxo-texas-language");
        const detected = isTexasLanguage(stored) ? stored : detectTexasLanguage(navigator.languages.length ? navigator.languages : [navigator.language]);
        setLanguage(enabledLanguages.includes(detected) ? detected : "es");
      } catch {
        const detected = detectTexasLanguage(navigator.languages.length ? navigator.languages : [navigator.language]);
        setLanguage(enabledLanguages.includes(detected) ? detected : "es");
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [enabledLanguages]);

  useEffect(() => {
    if (!isReservationOpen) return;
    reservationCloseRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsReservationOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isReservationOpen]);

  useEffect(() => {
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!languageRef.current?.contains(event.target as Node)) setIsLanguageMenuOpen(false);
    };
    window.addEventListener("pointerdown", closeOnOutsidePress);
    return () => window.removeEventListener("pointerdown", closeOnOutsidePress);
  }, []);

  const selectLanguage = (nextLanguage: TexasLanguage) => {
    setLanguage(nextLanguage);
    setIsLanguageMenuOpen(false);
    try { window.localStorage.setItem("tapixxo-texas-language", nextLanguage); } catch { /* Browser storage can be unavailable. */ }
  };

  const openReservation = () => {
    setIsLanguageMenuOpen(false);
    setIsReservationOpen(true);
  };

  const sendReservation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formattedDate = new Intl.DateTimeFormat("es-CO", { dateStyle: "full" }).format(new Date(`${reservationDate}T12:00:00`));
    const message = `Hola Texas Resto Bar, quiero hacer una reserva.\n\nCantidad de personas: ${reservationPartySize}\nFecha: ${formattedDate}\nHora: ${reservationTime}`;
    window.open(`${WHATSAPP_RESERVATION_URL}${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };

  return <main className={`${styles.page} ${onViewMenu ? styles.overlay : ""}`}>
    <div className={styles.topTexture} aria-hidden="true" />
    <div className={styles.languageControl} ref={languageRef}>
      <button type="button" className={styles.languageButton} aria-label={copy.language} aria-expanded={isLanguageMenuOpen} aria-controls="texas-multilink-language" onClick={() => setIsLanguageMenuOpen((open) => !open)}>
        <GlobeIcon /><span>{language.toUpperCase()}</span>
      </button>
      {isLanguageMenuOpen && <div id="texas-multilink-language" className={styles.languageMenu} role="menu" aria-label={copy.selectLanguage}>
        {TEXAS_LANGUAGE_OPTIONS.filter((option) => enabledLanguages.includes(option.code)).map((option) => <button key={option.code} type="button" role="menuitemradio" aria-checked={language === option.code} className={language === option.code ? styles.languageActive : ""} onClick={() => selectLanguage(option.code)}>{option.label}</button>)}
      </div>}
    </div>

    <section className={styles.content} aria-labelledby="texas-multilink-title">
      <div className={styles.brandLockup}>
        <Image className={styles.logo} src="/menu-assets/texas-logo.png" width={500} height={330} sizes="(max-width: 640px) 15rem, 18rem" priority alt="Texas Resto Bar" />
      </div>

      <nav className={styles.links} aria-label="Texas Resto Bar">
        {onViewMenu ? <button type="button" className={`${styles.primaryLink} ${styles.menuLink}`} onClick={onViewMenu}><MenuIcon /><span>{copy.menu}</span><i aria-hidden="true">→</i></button> : <Link href="/menu/texasrestobar" className={`${styles.primaryLink} ${styles.menuLink}`}><MenuIcon /><span>{copy.menu}</span><i aria-hidden="true">→</i></Link>}
        <button type="button" className={styles.primaryLink} onClick={openReservation}><CalendarIcon /><span>{copy.reservation}</span><i aria-hidden="true">→</i></button>
        <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className={styles.primaryLink}><WhatsAppIcon /><span>{copy.whatsapp}</span><i aria-hidden="true">→</i></a>
      </nav>

      <div className={styles.socials}>
        <span>{copy.socials}</span>
        <div>
          <a href="https://www.instagram.com/texas.restobar" target="_blank" rel="noreferrer" aria-label={copy.instagram}><InstagramIcon /></a>
          <a href="https://www.facebook.com/profile.php?id=100075994219417" target="_blank" rel="noreferrer" aria-label={copy.facebook}><FacebookIcon /></a>
        </div>
      </div>
    </section>

    {isReservationOpen && <div className={styles.reservationBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsReservationOpen(false); }}>
      <form className={styles.reservationDialog} onSubmit={sendReservation} role="dialog" aria-modal="true" aria-labelledby="texas-reservation-title" aria-describedby="texas-reservation-description">
        <button ref={reservationCloseRef} type="button" className={styles.reservationClose} onClick={() => setIsReservationOpen(false)} aria-label={copy.closeReservation}>×</button>
        <p className={styles.reservationEyebrow}>Texas Resto Bar</p>
        <h2 id="texas-reservation-title">{copy.reservationTitle}</h2>
        <p id="texas-reservation-description">{copy.reservationIntro}</p>
        <div className={styles.reservationFields}>
          <label htmlFor="texas-reservation-people"><span>{copy.people}</span><select id="texas-reservation-people" value={reservationPartySize} onChange={(event) => setReservationPartySize(event.target.value)} aria-label={copy.selectPeople}>{Array.from({ length: 20 }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count} {copy.people.toLocaleLowerCase()}</option>)}</select></label>
          <label htmlFor="texas-reservation-date"><span>{copy.date}</span><input id="texas-reservation-date" type="date" min={currentLocalDate()} required value={reservationDate} onChange={(event) => setReservationDate(event.target.value)} /></label>
          <label htmlFor="texas-reservation-time"><span>{copy.time}</span><select id="texas-reservation-time" value={reservationTime} onChange={(event) => setReservationTime(event.target.value)} aria-label={copy.selectTime}>{RESERVATION_HOURS.map((hour) => <option key={hour} value={hour}>{hour}</option>)}</select></label>
        </div>
        <button className={styles.reservationSubmit} type="submit"><WhatsAppIcon /><span>{copy.sendReservation}</span><i aria-hidden="true">→</i></button>
      </form>
    </div>}

    <div className={styles.bottomTexture} aria-hidden="true" />
  </main>;
}
