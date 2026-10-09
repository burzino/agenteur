import { describe, expect, it } from "vitest";
import { ALFABETO_CHIAVE, casualeDaSeme, generaChiavePartita } from "./casuale";

describe("casuale", () => {
  it("CA-12 la chiave ha 6 caratteri dall'alfabeto ammesso", () => {
    for (let seme = 1; seme <= 200; seme++) {
      const chiave = generaChiavePartita(casualeDaSeme(seme));
      expect(chiave).toHaveLength(6);
      for (const c of chiave) expect(ALFABETO_CHIAVE).toContain(c);
    }
  });

  it("CA-12 l'alfabeto non contiene 0, O, 1, I, L", () => {
    for (const vietato of "0O1IL") expect(ALFABETO_CHIAVE).not.toContain(vietato);
  });

  it("CA-12 due chiavi generate non sono sempre uguali", () => {
    const chiavi = new Set<string>();
    for (let seme = 1; seme <= 20; seme++) chiavi.add(generaChiavePartita(casualeDaSeme(seme)));
    expect(chiavi.size).toBeGreaterThan(1);
    expect(generaChiavePartita(() => Math.random())).not.toBe("");
  });

  it("CA-12 con lo stesso seme la chiave e' la stessa (generatore iniettato)", () => {
    expect(generaChiavePartita(casualeDaSeme(7))).toBe(generaChiavePartita(casualeDaSeme(7)));
  });

  it("CA-12 un generatore che restituisce quasi 1 non esce dall'alfabeto", () => {
    expect(generaChiavePartita(() => 0.9999999)).toBe("999999");
  });
});
