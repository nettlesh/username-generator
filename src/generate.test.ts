import { describe, expect, test } from "vitest";
import { generate, maxLength, randomInt, type Options, type Random } from "./generate";

const first: Random = () => 0;
const last: Random = (n) => n - 1;
const words = ["apple", "tiger"];
const plain: Options = {
  kind: "words",
  count: 1,
  separator: "",
  capitalized: false,
  leetspeak: false,
  digits: 0,
  digitsAt: "end",
};

describe("words", () => {
  test("joins the chosen number of words with the separator", () => {
    expect(generate({ ...plain, count: 3, separator: "-" }, words, first)).toBe(
      "apple-apple-apple",
    );
  });

  test("draws digit separators for each gap", () => {
    expect(generate({ ...plain, count: 2, separator: "digit" }, words, last)).toBe("tiger9tiger");
    const symbols = { ...plain, count: 2, separator: "digitOrSymbol" } as const;
    expect(generate(symbols, words, last)).toBe("tiger*tiger");
  });

  test("capitalizes, then replaces letters with leetspeak", () => {
    expect(generate({ ...plain, capitalized: true }, words, last)).toBe("Tiger");
    expect(generate({ ...plain, capitalized: true, leetspeak: true }, words, last)).toBe("7163r");
  });

  test("puts digits at the start, the end or either", () => {
    expect(generate({ ...plain, digits: 3 }, words, first)).toBe("apple000");
    expect(generate({ ...plain, digits: 3, digitsAt: "start" }, words, first)).toBe("000apple");
    expect(generate({ ...plain, digits: 1, digitsAt: "either" }, words, first)).toBe("0apple");
    expect(generate({ ...plain, digits: 1, digitsAt: "either" }, words, last)).toBe("tiger9");
  });
});

describe("characters", () => {
  const characters = { kind: "characters", length: 4, digits: false, symbols: false } as const;

  test("draws the chosen number of characters from the chosen sets", () => {
    expect(generate(characters, [], first)).toBe("aaaa");
    expect(generate(characters, [], last)).toBe("ZZZZ");
    expect(generate({ ...characters, digits: true }, [], last)).toBe("9999");
    expect(generate({ ...characters, digits: true, symbols: true }, [], last)).toBe("****");
  });

  test(`allows 1 to ${maxLength} characters`, () => {
    expect(generate({ ...characters, length: maxLength }, [], first)).toHaveLength(maxLength);
    expect(() => generate({ ...characters, length: 0 }, [], first)).toThrow(RangeError);
    expect(() => generate({ ...characters, length: maxLength + 1 }, [], first)).toThrow(RangeError);
  });
});

test("randomInt returns every value below n, and no others", () => {
  const values = new Set(Array.from({ length: 1000 }, () => randomInt(3)));
  expect([...values].sort()).toEqual([0, 1, 2]);
});
