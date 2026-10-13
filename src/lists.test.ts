import { expect, test } from "vitest";
import { excluded, lists, parse } from "./lists";

const texts = import.meta.glob<string>("./lists/eff_*.txt", {
  query: "?raw",
  import: "default",
  eager: true,
});

test("every list file is listed and is byte-identical to its source", async () => {
  expect(Object.keys(texts).sort()).toEqual(lists.map((list) => `./lists/${list.file}`).sort());
  for (const list of lists) {
    const bytes = new TextEncoder().encode(texts[`./lists/${list.file}`]);
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
    const hex = Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
    expect(hex, list.file).toBe(list.sha256);
  }
});

test("excluded words are in a list, and the words left are lowercase letters", () => {
  const all = new Set(Object.values(texts).flatMap((text) => text.match(/(?<=\t).+/g) ?? []));
  expect([...excluded].filter((word) => !all.has(word))).toEqual([]);
  const words = Object.values(texts).flatMap(parse);
  expect(words.filter((word) => !/^[a-z]+$/.test(word))).toEqual([]);
});
