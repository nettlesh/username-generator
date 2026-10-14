/** Returns a uniformly random integer from 0 to n - 1. */
export type Random = (n: number) => number;

export type Range = { min: number; max: number };

/** How many characters go in a position, and the characters they're drawn from. */
export type Slot = Range & { characters: string };

export type Options = {
  words: Range;
  case: "lower" | "capitalized" | "upper" | "random";
  leetspeak: boolean;
  start: Slot;
  /** A separator is 1 to 1 from one character, such as "-". */
  between: Slot;
  end: Slot;
  anywhere: Slot;
  ends: "both" | "either";
};

// GitHub's 39 is the longest username limit among major sites.
export const limits = { words: 5, characters: 40 };

export function generate(options: Options, words: string[], random: Random): string {
  check(options, words);
  const pick = (from: ArrayLike<string>) => from[random(from.length)];
  const count = ({ min, max }: Range) => min + random(max - min + 1);
  const draw = (slot: Slot) =>
    Array.from({ length: count(slot) }, () => pick(slot.characters)).join("");

  // Ranges can all draw 0, so an empty username is drawn again.
  for (;;) {
    const middle = Array.from(
      { length: count(options.words) },
      (_, i) => (i ? draw(options.between) : "") + shape(pick(words), options, random),
    ).join("");
    const side = options.ends === "either" ? random(2) : undefined;
    let username =
      (side === 1 ? "" : draw(options.start)) + middle + (side === 0 ? "" : draw(options.end));
    for (const character of draw(options.anywhere)) {
      const at = random(username.length + 1);
      username = username.slice(0, at) + character + username.slice(at);
    }
    if (username) return username;
  }
}

export function randomInt(n: number): number {
  // Redrawing values at or above the largest multiple of n keeps every result equally likely.
  const limit = 2 ** 32 - (2 ** 32 % n);
  const value = new Uint32Array(1);
  do crypto.getRandomValues(value);
  while (value[0] >= limit);
  return value[0] % n;
}

/** Throws a message the page can show when the options can't produce a username. */
function check(options: Options, words: string[]) {
  const positions = {
    Start: options.start,
    "Between words": options.between,
    End: options.end,
    Anywhere: options.anywhere,
  };
  for (const [name, { min, max }, limit] of [
    ["Words", options.words, limits.words] as const,
    ...Object.entries(positions).map(([name, slot]) => [name, slot, limits.characters] as const),
  ]) {
    if (![min, max].every(Number.isInteger) || min < 0 || max > limit) {
      throw new RangeError(`${name}: choose a whole number from 0 to ${limit}`);
    }
    if (min > max) throw new RangeError(`${name}: the minimum is above the maximum`);
  }
  for (const [name, slot] of Object.entries(positions)) {
    if (slot.max > 0 && !slot.characters) throw new RangeError(`${name}: choose some characters`);
  }
  if (options.words.max > 0 && words.length === 0) throw new RangeError("Words: choose a list");
  if (Math.max(options.words.max, options.start.max, options.end.max, options.anywhere.max) === 0) {
    throw new RangeError("Choose words or characters to generate");
  }
}

function shape(word: string, options: Options, random: Random): string {
  const cased =
    options.case === "upper"
      ? word.toUpperCase()
      : options.case === "capitalized"
        ? word[0].toUpperCase() + word.slice(1)
        : options.case === "random"
          ? Array.from(word, (c) => (random(2) ? c.toUpperCase() : c)).join("")
          : word;
  return options.leetspeak ? cased.replace(/[abegiostz]/gi, (c) => leet[c.toLowerCase()]) : cased;
}

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
