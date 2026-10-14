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

/**
 * A username's random choices, kept apart from how it's written, so changing the case, leetspeak
 * or separator rewrites the same username instead of drawing another.
 */
export type Draft = {
  start: string;
  /** Each word as listed, and with a random case drawn for each letter. */
  words: { lower: string; mixed: string }[];
  between: string[];
  end: string;
  /** Each character goes at an offset into one part: the start, words and betweens in order, then the end. */
  anywhere: { part: number; at: number; character: string }[];
};

export function draw(options: Options, words: string[], random: Random): Draft {
  check(options, words);
  // Ranges can all draw 0, so an empty username is drawn again.
  for (;;) {
    const picked = Array.from({ length: count(options.words, random) }, () => {
      const lower = pick(words, random);
      return { lower, mixed: Array.from(lower, (c) => (random(2) ? c.toUpperCase() : c)).join("") };
    });
    const side = options.ends === "either" ? random(2) : undefined;
    const draft: Draft = {
      start: side === 1 ? "" : fill(options.start, random),
      words: picked,
      between: picked.slice(1).map(() => fill(options.between, random)),
      end: side === 0 ? "" : fill(options.end, random),
      anywhere: [],
    };
    // A position on the boundary of two parts goes to the earlier one, so a separator added later
    // goes after it.
    const lengths = parts(
      draft,
      picked.map((word) => word.lower),
    ).map((part) => part.length);
    const total = lengths.reduce((sum, length) => sum + length, 0);
    for (const character of fill(options.anywhere, random)) {
      let at = random(total + 1);
      let part = 0;
      while (at > lengths[part]) at -= lengths[part++];
      draft.anywhere.push({ part, at, character });
    }
    if (total + draft.anywhere.length > 0) return draft;
  }
}

/** Draws new separators for a draft, keeping its words and characters. */
export function separate(draft: Draft, options: Options, words: string[], random: Random): Draft {
  check(options, words);
  return { ...draft, between: draft.between.map(() => fill(options.between, random)) };
}

export function format(draft: Draft, options: Options): string {
  return parts(
    draft,
    draft.words.map((word) => shape(word, options)),
  )
    .map((text, part) => {
      // A separator can be shorter than when the characters were placed, so offsets past its end
      // go at its end.
      const inserted = (i: number) =>
        draft.anywhere
          .filter((a) => a.part === part && Math.min(a.at, text.length) === i)
          .map((a) => a.character)
          .join("");
      return Array.from({ length: text.length + 1 }, (_, i) => inserted(i) + (text[i] ?? "")).join(
        "",
      );
    })
    .join("");
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

/** The draft's parts in order, with its words written as given. */
function parts(draft: Draft, words: string[]): string[] {
  return [
    draft.start,
    ...words.flatMap((word, i) => (i ? [draft.between[i - 1], word] : [word])),
    draft.end,
  ];
}

function shape({ lower, mixed }: Draft["words"][number], options: Options): string {
  const cased =
    options.case === "upper"
      ? lower.toUpperCase()
      : options.case === "capitalized"
        ? lower[0].toUpperCase() + lower.slice(1)
        : options.case === "random"
          ? mixed
          : lower;
  return options.leetspeak ? cased.replace(/[abegiostz]/gi, (c) => leet[c.toLowerCase()]) : cased;
}

function pick(from: ArrayLike<string>, random: Random): string {
  return from[random(from.length)];
}

function count({ min, max }: Range, random: Random): number {
  return min + random(max - min + 1);
}

function fill(slot: Slot, random: Random): string {
  return Array.from({ length: count(slot, random) }, () => pick(slot.characters, random)).join("");
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
