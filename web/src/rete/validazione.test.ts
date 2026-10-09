import { describe, expect, it } from "vitest";
import { validaMessaggio } from "./validazione";

describe("validazione", () => {
  it("CA-20 accetta i messaggi ben formati di ogni tipo", () => {
    const buoni: unknown[] = [
      { tipo: "unisciti", nome: "Anna" },
      { tipo: "unisciti", nome: "Anna", token: "ABC" },
      { tipo: "scegli", squadra: "rosso", ruolo: "spia" },
      { tipo: "esci" },
      { tipo: "indizio", parola: "mare", numero: 0 },
      { tipo: "indizio", parola: "mare", numero: 9 },
      { tipo: "scopri", indice: 0 },
      { tipo: "scopri", indice: 24 },
      { tipo: "terminaTurno" },
      { tipo: "nuovaPartita" },
    ];
    for (const b of buoni) expect(validaMessaggio(b).ok).toBe(true);
  });

  it("CA-20 non lancia mai e rifiuta input che non sono oggetti", () => {
    const strani: unknown[] = [null, undefined, 5, "unisciti", [], true, () => 1, Symbol("x")];
    for (const s of strani) {
      expect(() => validaMessaggio(s)).not.toThrow();
      expect(validaMessaggio(s).ok).toBe(false);
    }
  });

  it("CA-20 rifiuta tipo sconosciuto o mancante", () => {
    expect(validaMessaggio({ tipo: "hack" }).ok).toBe(false);
    expect(validaMessaggio({}).ok).toBe(false);
    expect(validaMessaggio({ tipo: 3 }).ok).toBe(false);
  });

  it("CA-20 rifiuta campi mancanti o di tipo sbagliato", () => {
    const cattivi: unknown[] = [
      { tipo: "unisciti" },
      { tipo: "unisciti", nome: 5 },
      { tipo: "unisciti", nome: "Anna", token: 7 },
      { tipo: "scegli", squadra: "rosso" },
      { tipo: "scegli", ruolo: "spia" },
      { tipo: "indizio", parola: "mare" },
      { tipo: "indizio", numero: 1 },
      { tipo: "indizio", parola: 3, numero: 1 },
      { tipo: "indizio", parola: "mare", numero: "2" },
      { tipo: "scopri" },
      { tipo: "scopri", indice: "3" },
    ];
    for (const c of cattivi) expect(validaMessaggio(c).ok).toBe(false);
  });

  it("CA-20 rifiuta valori fuori dominio", () => {
    const cattivi: unknown[] = [
      { tipo: "indizio", parola: "mare", numero: -1 },
      { tipo: "indizio", parola: "mare", numero: 10 },
      { tipo: "indizio", parola: "mare", numero: 1.5 },
      { tipo: "indizio", parola: "mare", numero: NaN },
      { tipo: "scopri", indice: -1 },
      { tipo: "scopri", indice: 25 },
      { tipo: "scopri", indice: 2.5 },
      { tipo: "scegli", squadra: "verde", ruolo: "spia" },
      { tipo: "scegli", squadra: "rosso", ruolo: "capo" },
      { tipo: "unisciti", nome: "" },
      { tipo: "unisciti", nome: "   " },
      { tipo: "unisciti", nome: "x".repeat(21) },
    ];
    for (const c of cattivi) expect(validaMessaggio(c).ok).toBe(false);
    expect(validaMessaggio({ tipo: "unisciti", nome: "x".repeat(20) }).ok).toBe(true);
  });
});
