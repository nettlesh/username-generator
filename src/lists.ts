import excludedText from "./lists/excluded.txt?raw";

export type List = { name: string; file: string; source: string; licence: string; sha256: string };

// EFF's files, byte-identical to their source and under its file names, so each can be checked
// against its checksum.
export const lists: List[] = [
  {
    name: "Large",
    file: "eff_large_wordlist.txt",
    source: "https://www.eff.org/files/2016/07/18/eff_large_wordlist.txt",
    licence: "CC BY 4.0",
    sha256: "addd35536511597a02fa0a9ff1e5284677b8883b83e986e43f15a3db996b903e",
  },
  {
    name: "Short 1",
    file: "eff_short_wordlist_1.txt",
    source: "https://www.eff.org/files/2016/09/08/eff_short_wordlist_1.txt",
    licence: "CC BY 4.0",
    sha256: "8f5ca830b8bffb6fe39c9736c024a00a6a6411adb3f83a9be8bfeeb6e067ae69",
  },
  {
    name: "Short 2",
    file: "eff_short_wordlist_2_0.txt",
    source: "https://www.eff.org/files/2016/09/08/eff_short_wordlist_2_0.txt",
    licence: "CC BY 4.0",
    sha256: "22b45c52e0bd0bbf03aa522240b111eb4c7c0c1d86c4e518e1be2a7eb2a625e4",
  },
];

export const excluded = new Set(
  excludedText.split("\n").filter((line) => line && !line.startsWith("#")),
);

/** Returns a list's words, leaving out the excluded ones. */
export function parse(text: string): string[] {
  // Each line is a dice roll, a tab and a word.
  return text
    .split("\n")
    .map((line) => line.split("\t")[1])
    .filter((word) => word && !excluded.has(word));
}
