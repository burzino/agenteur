// Schermo acceso (Screen Wake Lock) e vibrazione. Funzioni del browser, non della rete.

/**
 * Tiene lo schermo acceso finche' non si chiama la funzione restituita.
 * Richiede il blocco di nuovo quando la pagina torna visibile (il browser lo rilascia in background).
 * Ogni errore (API assente, permesso negato) e' ignorato.
 */
export function mantieniSchermoAcceso(): () => void {
  let attivo = true;
  let sentinella: WakeLockSentinel | null = null;
  let inRichiesta = false;

  const richiedi = async (): Promise<void> => {
    if (!attivo || sentinella !== null || inRichiesta) return;
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    inRichiesta = true;
    try {
      const s = await navigator.wakeLock.request("screen");
      if (!attivo) {
        await s.release().catch(() => undefined);
        return;
      }
      sentinella = s;
      s.addEventListener("release", () => {
        if (sentinella === s) sentinella = null;
      });
    } catch {
      // ignorato: batteria scarsa, permesso negato, API assente
    } finally {
      inRichiesta = false;
    }
  };

  const alCambioVisibilita = (): void => {
    if (document.visibilityState === "visible") void richiedi();
  };

  document.addEventListener("visibilitychange", alCambioVisibilita);
  void richiedi();

  return () => {
    attivo = false;
    document.removeEventListener("visibilitychange", alCambioVisibilita);
    const s = sentinella;
    sentinella = null;
    if (s !== null) void s.release().catch(() => undefined);
  };
}

const CHIAVE_VIBRAZIONE = "agenteur.vibrazione";

/** True se la vibrazione e' consentita (default true; si disattiva dalle Impostazioni). */
export function vibrazioneAttiva(): boolean {
  try {
    return localStorage.getItem(CHIAVE_VIBRAZIONE) !== "false";
  } catch {
    return true;
  }
}

/** Vibra brevemente (150 ms) se consentito e supportato. */
export function vibra(): void {
  try {
    if (vibrazioneAttiva()) navigator.vibrate?.(150);
  } catch {
    // ignorato
  }
}
