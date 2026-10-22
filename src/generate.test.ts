import { describe, expect, test } from "vitest";
import {
  draw,
  fit,
  format,
  least,
  limits,
  measure,
  need,
  randomInt,
  reach,
  room,
  span,
  type Options,
  type Random,
} from "./generate";

const generate = (options: Options, from: string[], random: Random) =>
  format(draw(options, from, random), options);
const first: Random = () => 0;
const last: Random = (n) => n - 1;
const words = ["apple", "tiger"];
const none = { min: 0, max: 0, characters: "" };
const digits = { min: 0, max: 2, characters: "0123456789" };
const plain: Options = {
  words: { min: 1, max: 1 },
  case: "lower",
  leetspeak: false,
  between: none,
  start: none,
  end: none,
  spots: { min: 0, max: 0 },
  inside: none,
  joins: ["or", "and"],
};

describe("words", () => {
  test("draws a count from the range and puts the separator between words", () => {
    const options: Options = {
      ...plain,
      words: { min: 1, max: 3 },
      between: { min: 1, max: 1, characters: "-" },
    };
    expect(generate(options, words, first)).toBe("apple");
    expect(generate(options, words, last)).toBe("tiger-tiger-tiger");
  });

  test("applies the case, then leetspeak", () => {
    expect(generate({ ...plain, case: "capitalized" }, words, last)).toBe("Tiger");
    expect(generate({ ...plain, case: "upper" }, words, last)).toBe("TIGER");
    expect(generate({ ...plain, case: "random" }, words, last)).toBe("TIGER");
    expect(generate({ ...plain, case: "random" }, words, first)).toBe("apple");
    expect(generate({ ...plain, case: "capitalized", leetspeak: true }, words, last)).toBe("7163r");
  });

  test("repeats a separator up to its count", () => {
    const options: Options = {
      ...plain,
      words: { min: 2, max: 2 },
      between: { min: 2, max: 2, characters: "-" },
    };
    expect(generate(options, words, last)).toBe("tiger--tiger");
  });

  test("draws characters between words for each gap", () => {
    const options: Options = { ...plain, words: { min: 2, max: 2 }, between: digits };
    expect(generate(options, words, first)).toBe("appleapple");
    expect(generate(options, words, last)).toBe("tiger99tiger");
  });

  test("makes usernames from characters alone, with no words", () => {
    const options: Options = {
      ...plain,
      words: { min: 0, max: 0 },
      start: { min: 4, max: 4, characters: "ab" },
      spots: { min: 1, max: 1 },
      inside: { min: 1, max: 1, characters: "7" },
    };
    // Inside needs a word to go in, so without words it's left out.
    expect(generate(options, [], last)).toBe("bbbb");
  });

  test("draws again when a username comes out empty", () => {
    let calls = 0;
    const emptyFirst: Random = (n) => (calls++ === 0 ? 0 : n - 1);
    expect(generate({ ...plain, words: { min: 0, max: 1 } }, words, emptyFirst)).toBe("tiger");
  });
});

describe("places", () => {
  const start = { min: 1, max: 1, characters: "s" };
  const end = { min: 1, max: 1, characters: "e" };
  const inside = { min: 1, max: 1, characters: "7" };
  const all: Options = { ...plain, start, end, spots: { min: 1, max: 1 }, inside };

  test("adds characters at the start and end", () => {
    const options: Options = { ...plain, start: digits, end: { ...digits, characters: "xyz" } };
    const both: Options = { ...options, joins: ["and", "and"] };
    expect(generate(both, words, first)).toBe("apple");
    expect(generate(both, words, last)).toBe("99tigerzz");
    // With "or", a draw uses one end or the other.
    expect(generate(options, words, last)).toBe("tigerzz");
  });

  test("join as the sentence reads, the first pairing start and end", () => {
    // Start or End, and Inside: one end, and inside.
    expect(generate(all, words, first)).toBe("sa7pple");
    expect(generate(all, words, last)).toBe("tige7re");
    // Start and End, or Inside: both ends, or inside alone.
    const either: Options = { ...all, joins: ["and", "or"] };
    expect(generate(either, words, first)).toBe("sapplee");
    expect(generate(either, words, last)).toBe("tige7r");
  });

  test("puts each block inside the words in its own gap", () => {
    const options: Options = {
      ...plain,
      spots: { min: 2, max: 2 },
      inside: { min: 2, max: 2, characters: "12" },
    };
    expect(generate(options, words, first)).toBe("a11p11ple");
  });

  test("lets a spot take no characters, as other counts can", () => {
    const options: Options = {
      ...plain,
      spots: { min: 1, max: 1 },
      inside: { min: 0, max: 1, characters: "7" },
    };
    expect(generate(options, words, first)).toBe("apple");
    expect(generate(options, words, last)).toBe("tige7r");
  });

  test("draws words long enough to have a gap for every spot", () => {
    const options: Options = {
      ...plain,
      spots: { min: 3, max: 3 },
      inside: { ...inside, characters: "1" },
    };
    expect(generate(options, ["fig", "apple"], first)).toBe("a1p1p1le");
  });
});

describe("limit", () => {
  const lengths = measure(words);
  const ends: Options = {
    ...plain,
    start: { min: 1, max: 2, characters: "0" },
    end: { min: 1, max: 30, characters: "0" },
    joins: ["and", "and"],
  };

  test("needs room for every count at its most, with the shortest words", () => {
    expect(need(ends, lengths)).toBe(37);
    expect(need({ ...ends, joins: ["or", "and"] }, lengths)).toBe(35);
    expect(span(ends, lengths)).toEqual({ min: 7, max: 37 });
  });

  test("leaves each count the room the others don't take", () => {
    // 40 - 5 for the word - 30 for End.
    expect(room(ends, "start", lengths)).toBe(5);
    expect(room(ends, "end", lengths)).toBe(33);
    // With "or" only one end is used, so neither takes room from the other.
    expect(room({ ...ends, joins: ["or", "and"] }, "end", lengths)).toBe(35);
  });

  test("lets a count reach further by taking room from the others", () => {
    // Start can take whatever End holds above its minimum: 40 - 5 for the word - 1 for End.
    expect(reach(ends, "start", lengths)).toBe(34);
    const claimed = fit({ ...ends, start: { ...ends.start, max: 34 } }, lengths, "start");
    expect([claimed.start.max, claimed.end.max]).toEqual([34, 1]);
  });

  test("count the current words when given them, so no count takes their room", () => {
    const short = measure(["fig", "tiger"]);
    // 40 - 3 for the shortest word, or 5 for tiger - 1 for End.
    expect(reach(ends, "start", short)).toBe(36);
    expect(reach(ends, "start", short, ["tiger"])).toBe(34);
    // With Words at 0-1 and tiger drawn, spots have room only in tiger's 4 gaps.
    const maybe: Options = {
      ...ends,
      words: { min: 0, max: 1 },
      spots: { min: 0, max: 1 },
      inside: { min: 1, max: 1, characters: "7" },
    };
    expect(reach(maybe, "spots", short, ["tiger"])).toBe(4);
    const options: Options = {
      ...ends,
      words: { min: 1, max: 2 },
      start: { ...ends.start, max: 34 },
    };
    const fitted = fit(options, short, "start", ["tiger"]);
    expect([fitted.end.max, fitted.words.max]).toEqual([1, 2]);
  });

  test("never push spots and per spot against each other, as they're one place", () => {
    const options: Options = {
      ...plain,
      spots: { min: 0, max: 1 },
      inside: { min: 0, max: 1, characters: "7" },
    };
    // tiger has 4 gaps, so spots stop there, not further by switching per spot, and inside, off.
    expect(reach(options, "spots", lengths, ["tiger"])).toBe(4);
    const fitted = fit({ ...options, spots: { min: 0, max: 6 } }, lengths, undefined, ["tiger"]);
    expect([fitted.spots.max, fitted.inside.max]).toEqual([4, 1]);
  });

  test("fits the limit by lowering the largest counts first", () => {
    const options: Options = {
      ...ends,
      start: { ...ends.start, max: 25 },
      end: { ...ends.end, max: 20 },
    };
    const fitted = fit(options, lengths);
    expect([fitted.start.max, fitted.end.max]).toEqual([17, 18]);
    expect(need(fitted, lengths)).toBe(limits.characters);
    expect(least(ends, lengths)).toBe(7);
  });

  test("draws only words that fit the room the characters leave", () => {
    const options: Options = { ...plain, end: { min: 36, max: 36, characters: "0" } };
    expect(generate(options, ["apple", "fig"], last)).toBe("fig" + "0".repeat(36));
  });
});

describe("drafts", () => {
  test("keep their words when the case or leetspeak changes", () => {
    const options: Options = { ...plain, words: { min: 2, max: 2 } };
    // Each word, then a random case for each of its letters: tiger as TiGeR, then apple as aPpLe.
    const draws = [1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0];
    const draft = draw(options, words, (n) => (n === 2 ? draws.shift()! : 0));
    expect(format(draft, options)).toBe("tigerapple");
    expect(format(draft, { ...options, case: "capitalized" })).toBe("TigerApple");
    expect(format(draft, { ...options, case: "random" })).toBe("TiGeRaPpLe");
    expect(format(draft, { ...options, case: "random", leetspeak: true })).toBe("7163R4PpL3");
  });

  test("keep the parts whose options didn't change", () => {
    const options: Options = {
      ...plain,
      words: { min: 2, max: 2 },
      between: { min: 1, max: 1, characters: "-" },
    };
    const draft = draw(options, words, last);
    expect(format(draft, options)).toBe("tiger-tiger");
    const dot: Options = { ...options, between: { min: 1, max: 1, characters: "." } };
    expect(format(draw(dot, words, first, { draft, changed: ["between"] }), dot)).toBe(
      "tiger.tiger",
    );
    const end: Options = { ...options, end: { min: 1, max: 1, characters: "7" } };
    expect(format(draw(end, words, first, { draft, changed: ["places"] }), end)).toBe(
      "tiger-tiger7",
    );
    expect(format(draw(options, words, first, { draft, changed: ["words"] }), options)).toBe(
      "apple-apple",
    );
  });

  test("draw the words again when they no longer fit", () => {
    const draft = draw(plain, ["fig", "apple"], last);
    expect(format(draft, plain)).toBe("apple");
    const longer: Options = { ...plain, end: { min: 36, max: 36, characters: "0" } };
    const redrawn = draw(longer, ["fig", "apple"], last, { draft, changed: ["places"] });
    expect(format(redrawn, longer)).toBe("fig" + "0".repeat(36));
  });
});

test("rejects options that can't produce a username", () => {
  const throws = (options: Options, from = words) =>
    expect(() => generate(options, from, first)).toThrow(RangeError);
  throws({ ...plain, words: { min: 2, max: 1 } });
  throws({ ...plain, words: { min: 1, max: limits.words + 1 } });
  throws({ ...plain, start: { min: 0, max: limits.characters + 1, characters: "a" } });
  throws({ ...plain, start: { min: 0, max: 1, characters: "" } });
  throws({ ...plain, words: { min: 0, max: 0 } });
  throws({ ...plain, end: { min: 38, max: 38, characters: "0" } });
  throws(plain, []);
});

test("randomInt returns every value below n, and no others", () => {
  const values = new Set(Array.from({ length: 1000 }, () => randomInt(3)));
  expect([...values].sort()).toEqual([0, 1, 2]);
});
