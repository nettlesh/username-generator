# Agent instructions

A static site that generates usernames in the browser, combining the styles of
popular password managers' generators with openly licensed word lists.
[README](README.md) says what it does; [Contributing](CONTRIBUTING.md) covers
commits, pull requests, and the AI disclosure.

## Working agreements

- Work in one small, agreed slice at a time. Revisit scope when new evidence
  warrants it; distinguish proposals from implemented behavior.
- Discuss product scope, dependency, and structure changes with the owner before
  implementing them. Within agreed scope, explain any file split or supporting
  type and keep it lean.
- Prefer officially supported paths, authoritative documentation, and
  established conventions. Check upstream guidance first and explain necessary
  departures.
- Before saying a tool or library lacks something, check its latest release and
  documentation, not only the version locked here, and say which version you
  checked. A release-age cutoff is never a reason to write your own version of
  what a newer release provides: exempt that tool from the cutoff until the
  release is old enough, with a dated `TODO:`.
- Use mise for project tools and tasks. Run checks appropriate to the change and
  report actual results and gaps; `mise run check` runs the shared checks and
  `mise run test` the tests.
- Commit and push only when the owner explicitly asks. Leave merge and
  publication authority with the owner. Keep credentials and personal machine
  configuration out of the repository.

## Product rules

- Usernames come from `crypto.getRandomValues` in the browser. The page makes no
  requests except for its own files, and sends nothing anywhere.
- Every word list names its source and licence, on the page and in
  `src/lists.ts`. Add only lists whose licence is compatible with the
  repository's.
- List files stay byte-identical to their source, checked against the SHA-256 in
  `src/lists.ts`. Words the generator skips go in `src/lists/excluded.txt`, and
  each must appear in a list.
- The site is served under `/username-generator/`; `vite.config.ts` sets the
  base path once.

## Development

- Write minimal, explicit code with readable control flow. Add abstractions,
  dependencies, options, or fallbacks only for a current requirement, proven
  constraint, or observed failure. Remove dead branches.
- Reuse platform and library capabilities before writing your own.
- Validate at trust boundaries, such as user input and fetched files; inside,
  rely on types, and let impossible states fail loudly. Never drop an error or
  report success that didn't happen.
- Store each fact once and derive the rest; define shared values, such as design
  tokens in `src/style.css`, once.
- Keep a feature's state, operations, types, and helpers together. Split a file
  only for a separate responsibility, real reuse, or clearer code. Order files
  with public code before private helpers.
- Inline trivial aliases and forwarding helpers. Keep a helper when it adds
  meaning, isolates substantial detail, or centralizes a rule.

### Naming

- Use the shortest precise name for its scope, one word per concept, and keep
  the word the code already uses.
- TypeScript files and values are `camelCase`, types `PascalCase`, and CSS
  `kebab-case`.
- A boolean reads as a statement about its owner (`capitalized`, `hasDigits`).
  Name functions for what they do (`generate`, not `handleGenerate`), and
  callbacks `on` plus a present-tense event, as the DOM's are.

### Comments

Explain decisions, constraints, and non-obvious reasons the code cannot express,
succinctly, for a reader who was not present. Don't restate the code or narrate
changes. Mark known gaps with a [PEP 350](https://peps.python.org/pep-0350/)
codetag in capitals with a colon: `TODO:` for missing work, `FIXME:` for broken
code, `HACK:` for a workaround, `CAVEAT:` for a trap.

## Testing

- Add a few behavioral tests with each feature, covering its public contract and
  important failures. Avoid tests that mirror the implementation, overlapping
  cases, and tests written only for completeness.
- Vitest runs in Node, colocated as `*.test.ts`. The generator takes its random
  source as an argument, so tests pass a deterministic one.
- Keep literals when the value defines the case, such as a length limit or an
  empty list.
- Check the page itself in a browser; tests don't cover it.
