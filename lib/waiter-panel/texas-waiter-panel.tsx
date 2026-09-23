"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./texas-waiter-panel.module.css";

type ServiceRequest = {
  id: string;
  table_label: string;
  plate_code: string;
  status: "pending" | "resolved";
  requested_at: string;
  resolved_at: string | null;
};

const REQUESTS_ENDPOINT = "/api/waiter/texasrestobar/requests";
const PUSH_SUBSCRIPTION_ENDPOINT = "/api/waiter/texasrestobar/push-subscription";
const TEST_PUSH_ENDPOINT = "/api/waiter/texasrestobar/test-push";
const NOTIFICATION_STORAGE_KEY = "tapixxo_texas_waiter_notifications";
const TEXAS_LOGO = "/menu-assets/texas-logo.png";
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_TEXAS_WAITER_VAPID_PUBLIC_KEY;

function BellIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9.5a6 6 0 0 0-12 0c0 7-2.5 7-2.5 8.5h17C20.5 16.5 18 16.5 18 9.5ZM9.5 21h5" /></svg>;
}

function CheckIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.25 4.25L19.5 6.5" /></svg>;
}

function formatRequestedAt(value: string) {
  return new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function isInstalledWebApp() {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
}

function isIPhoneOrIPad() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function subscriptionPayload(subscription: PushSubscription) {
  const keys = subscription.toJSON().keys;
  return {
    endpoint: subscription.endpoint,
    keys: { p256dh: keys?.p256dh ?? "", auth: keys?.auth ?? "" },
  };
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from(rawData, (character) => character.charCodeAt(0));
}

export function TexasWaiterPanel() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [isTestingNotification, setIsTestingNotification] = useState(false);
  const [needsHomeScreenInstallation, setNeedsHomeScreenInstallation] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    if (typeof window === "undefined" || typeof Notification === "undefined") return false;
    try {
      return window.localStorage.getItem(NOTIFICATION_STORAGE_KEY) === "true" && Notification.permission === "granted";
    } catch {
      return false;
    }
  });
  const knownRequestIds = useRef(new Set<string>());
  const loadedOnce = useRef(false);
  const alertAudio = useRef<HTMLAudioElement | null>(null);

  const playAlert = useCallback(() => {
    try {
      const audio = alertAudio.current ?? new Audio("/menu-assets/texas-waiter-alert.wav");
      audio.preload = "auto";
      audio.currentTime = 0;
      alertAudio.current = audio;
      void audio.play().catch(() => {
        // Browsers may block sound until the waiter has interacted with the page.
      });
    } catch {
      // The visual notification remains available when audio is blocked.
    }
  }, []);

  const loadRequests = useCallback(async () => {
    try {
      const response = await fetch(REQUESTS_ENDPOINT, { cache: "no-store" });
      const result = await response.json() as { requests?: ServiceRequest[]; error?: string };
      if (!response.ok || !result.requests) throw new Error(result.error ?? "No se pudieron cargar las llamadas.");

      const pending = result.requests.filter((request) => request.status === "pending");
      const newRequests = pending.filter((request) => !knownRequestIds.current.has(request.id));
      if (loadedOnce.current && notificationsEnabled && newRequests.length) {
        playAlert();
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          newRequests.forEach((serviceRequest) => {
            const notification = new Notification("Texas Resto Bar · Llamado de mesa", {
              body: `${serviceRequest.table_label} solicita atención`,
              icon: TEXAS_LOGO,
              badge: TEXAS_LOGO,
              tag: `texas-waiter-${serviceRequest.id}`,
            });
            notification.onclick = () => {
              window.focus();
              notification.close();
            };
          });
        }
      }
      knownRequestIds.current = new Set(result.requests.map((request) => request.id));
      loadedOnce.current = true;
      setRequests(result.requests);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las llamadas.");
    } finally {
      setIsLoading(false);
    }
  }, [notificationsEnabled, playAlert]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadRequests(), 0);
    const interval = window.setInterval(() => void loadRequests(), 6_000);
    const refreshOnFocus = () => void loadRequests();
    window.addEventListener("focus", refreshOnFocus);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [loadRequests]);

  useEffect(() => () => {
    alertAudio.current?.pause();
    alertAudio.current = null;
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;
    void navigator.serviceWorker.register("/waiter-sw.js", { scope: "/" }).then(async (registration) => {
      if (!cancelled && isIPhoneOrIPad() && !isInstalledWebApp()) {
        setNeedsHomeScreenInstallation(true);
      }
      const subscription = await registration.pushManager.getSubscription();
      if (!cancelled && subscription && Notification.permission === "granted") {
        setNotificationsEnabled(true);
      }
    }).catch(() => {
      if (!cancelled) setError("No se pudo preparar las notificaciones de este dispositivo.");
    });

    return () => { cancelled = true; };
  }, []);

  const toggleNotifications = async () => {
    if (notificationsEnabled) {
      try {
        const registration = await navigator.serviceWorker?.ready;
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription) {
          await fetch(PUSH_SUBSCRIPTION_ENDPOINT, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(subscriptionPayload(subscription)),
          });
          await subscription.unsubscribe();
        }
      } catch {
        // The local switch still silences this browser if it cannot reach the server.
      }
      setNotificationsEnabled(false);
      try {
        window.localStorage.removeItem(NOTIFICATION_STORAGE_KEY);
      } catch {
        // The current session still remains silenced if storage is unavailable.
      }
      setError("");
      return;
    }

    if (typeof Notification === "undefined") {
      setError("Este navegador no admite notificaciones.");
      return;
    }
    if (needsHomeScreenInstallation) {
      setError("En iPhone, usa Compartir → Añadir a pantalla de inicio y abre Texas Meseros desde ese icono para activar alertas.");
      return;
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !VAPID_PUBLIC_KEY) {
      setError("Las alertas push de este dispositivo aún no están configuradas.");
      return;
    }

    const permission = await Notification.requestPermission();
    const enabled = permission === "granted";
    setNotificationsEnabled(enabled);
    if (!enabled) {
      try {
        window.localStorage.removeItem(NOTIFICATION_STORAGE_KEY);
      } catch {
        // No persisted alert setting needs to be changed when storage is unavailable.
      }
      setError("Activa las notificaciones del navegador para recibir avisos.");
      return;
    }
    try {
      const registration = await navigator.serviceWorker.register("/waiter-sw.js", { scope: "/" });
      const subscription = await registration.pushManager.getSubscription() ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      const response = await fetch(PUSH_SUBSCRIPTION_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscriptionPayload(subscription)),
      });
      if (!response.ok) throw new Error("No se pudo registrar este dispositivo.");
      window.localStorage.setItem(NOTIFICATION_STORAGE_KEY, "true");
      playAlert();
    } catch (subscriptionError) {
      setNotificationsEnabled(false);
      setError(subscriptionError instanceof Error ? subscriptionError.message : "No se pudo activar este dispositivo.");
      return;
    }
    setError("");
  };

  const resolveRequest = async (requestId: string) => {
    if (resolvingId) return;
    setResolvingId(requestId);
    try {
      const response = await fetch(REQUESTS_ENDPOINT, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId }) });
      const result = await response.json() as { request?: ServiceRequest; error?: string };
      if (!response.ok || !result.request) throw new Error(result.error ?? "No se pudo resolver la solicitud.");
      setRequests((current) => current.map((request) => request.id === result.request?.id ? result.request : request));
    } catch (resolveError) {
      setError(resolveError instanceof Error ? resolveError.message : "No se pudo resolver la solicitud.");
    } finally {
      setResolvingId(null);
    }
  };

  const testNotification = async () => {
    if (isTestingNotification) return;
    setIsTestingNotification(true);
    try {
      const response = await fetch(TEST_PUSH_ENDPOINT, { method: "POST" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "No se pudo enviar la alerta de prueba.");
      setError("Alerta de prueba enviada. Revisa la notificación del teléfono.");
    } catch (testError) {
      setError(testError instanceof Error ? testError.message : "No se pudo enviar la alerta de prueba.");
    } finally {
      setIsTestingNotification(false);
    }
  };

  const pendingRequests = requests.filter((request) => request.status === "pending");
  const resolvedRequests = requests.filter((request) => request.status === "resolved");

  return <main className={styles.page}>
    <header className={styles.header}>
      <Image
        className={styles.brandLogo}
        src={TEXAS_LOGO}
        alt="Texas Resto Bar"
        width={192}
        height={128}
        priority
        sizes="(max-width: 480px) 8.5rem, 10rem"
      />
      <div className={styles.headerDetails}>
        <div><p>Texas Resto Bar</p><h1>Panel de meseros</h1><span>{pendingRequests.length} llamada{pendingRequests.length === 1 ? "" : "s"} pendiente{pendingRequests.length === 1 ? "" : "s"}</span></div>
        <div className={styles.notificationControls}>
          <button type="button" className={`${styles.bell} ${notificationsEnabled ? styles.bellActive : ""}`} onClick={() => void toggleNotifications()} aria-pressed={notificationsEnabled} aria-label={notificationsEnabled ? "Silenciar alertas del turno" : "Activar alertas del turno"} title={notificationsEnabled ? "Silenciar alertas del turno" : "Activar alertas del turno"}><BellIcon /><span>{notificationsEnabled ? "Alertas activas" : "Alertas silenciadas"}</span></button>
          {notificationsEnabled && <button type="button" className={styles.testButton} onClick={() => void testNotification()} disabled={isTestingNotification}>{isTestingNotification ? "Enviando…" : "Probar alerta"}</button>}
        </div>
      </div>
    </header>

    {needsHomeScreenInstallation && <p className={styles.installHint} role="status">En iPhone: toca <strong>Compartir</strong>, elige <strong>Añadir a pantalla de inicio</strong> y abre <strong>Texas Meseros</strong> desde el nuevo icono para recibir alertas.</p>}

    {error && <p className={styles.error} role="alert">{error}</p>}
    <section className={styles.section} aria-live="polite"><div className={styles.sectionTitle}><h2>Solicitudes activas</h2><span>{isLoading ? "Actualizando…" : "Se actualiza automáticamente"}</span></div>
      {isLoading ? <div className={styles.skeleton} aria-label="Cargando solicitudes" /> : pendingRequests.length ? <ul className={styles.requestList}>{pendingRequests.map((request) => <li key={request.id} className={styles.requestCard}><div><strong>{request.table_label}</strong><span>Placa {request.plate_code} · {formatRequestedAt(request.requested_at)}</span><p>Solicita atención</p></div><button type="button" className={styles.resolveButton} disabled={resolvingId === request.id} onClick={() => void resolveRequest(request.id)} aria-label={`Marcar ${request.table_label} como atendida`}><CheckIcon /><span>{resolvingId === request.id ? "Marcando…" : "Atendida"}</span></button></li>)}</ul> : <div className={styles.empty}><span>✓</span><h2>Todo en orden</h2><p>No hay mesas esperando atención.</p></div>}
    </section>

    {resolvedRequests.length > 0 && <section className={styles.resolvedSection}><h2>Atendidas recientemente</h2><ul>{resolvedRequests.slice(0, 10).map((request) => <li key={request.id}><CheckIcon /><span>{request.table_label}</span><time>{formatRequestedAt(request.resolved_at ?? request.requested_at)}</time></li>)}</ul></section>}
  </main>;
}
