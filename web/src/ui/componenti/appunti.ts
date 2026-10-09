/** Copia un testo negli appunti. Prova l'API moderna, poi il metodo vecchio (pagine non sicure). */
export async function copiaTesto(testo: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(testo);
    return true;
  } catch {
    /* si prova il metodo alternativo */
  }
  try {
    const area = document.createElement("textarea");
    area.value = testo;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}
