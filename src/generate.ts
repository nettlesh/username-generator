/** Returns a uniformly random integer from 0 to n - 1. */
export type Random = (n: number) => number;

export type Separator = "" | "-" | "." | "_" | "digit" | "digitOrSymbol";

export type Options =
  | {
      kind: "words";
      count: number;
      separator: Separator;
      capitalized: boolean;
      leetspeak: boolean;
      digits: number;
      digitsAt: "start" | "end" | "either";
    }
  | { kind: "characters"; length: number; digits: boolean; symbols: boolean };

// GitHub's 39 is the longest limit among major sites.
export const maxLength = 40;

export function generate(options: Options, words: string[], random: Random): string {
  const pick = (from: ArrayLike<string>) => from[random(from.length)];

  if (options.kind === "characters") {
    if (options.length < 1 || options.length > maxLength) {
      throw new RangeError(`A username has 1 to ${maxLength} characters`);
    }
    const characters = letters + (options.digits ? digits : "") + (options.symbols ? symbols : "");
    return Array.from({ length: options.length }, () => pick(characters)).join("");
  }

  // Digit separators are drawn afresh for each gap.
  const gap = () =>
    options.separator === "digit"
      ? pick(digits)
      : options.separator === "digitOrSymbol"
        ? pick(digits + symbols)
        : options.separator;
  const username = Array.from({ length: options.count }, () => {
    let word = pick(words);
    if (options.capitalized) word = word[0].toUpperCase() + word.slice(1);
    if (options.leetspeak) word = word.replace(/[abegiostz]/gi, (c) => leet[c.toLowerCase()]);
    return word;
  }).reduce((joined, word) => joined + gap() + word);
  const number = Array.from({ length: options.digits }, () => pick(digits)).join("");
  const atStart =
    options.digitsAt === "start" || (options.digitsAt === "either" && random(2) === 0);
  return atStart ? number + username : username + number;
}

export function randomInt(n: number): number {
  // Redrawing values at or above the largest multiple of n keeps every result equally likely.
  const limit = 2 ** 32 - (2 ** 32 % n);
  const value = new Uint32Array(1);
  do crypto.getRandomValues(value);
  while (value[0] >= limit);
  return value[0] % n;
}

const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const digits = "0123456789";
const symbols = "!@#$%^&*";
const leet: Record<string, string> = {
  a: "4",
  b: "8",
  e: "3",
  g: "6",
  i: "1",
  o: "0",
  s: "5",
  t: "7",
  z: "2",
};
