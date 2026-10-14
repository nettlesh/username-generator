# Username generator

Generate usernames from random words or characters, with the options of popular
password managers' generators. Everything runs in your browser with
`crypto.getRandomValues`; nothing is sent anywhere.

A companion to [remask](https://github.com/nettlesh/remask).

## Quick start

With mise installed:

```sh
mise install --locked
mise run install
mise run dev
```

`mise run check` runs the formatters and linters, `mise run test` the tests, and
`mise run build` writes the site to `dist/`. See [Contributing](CONTRIBUTING.md)
for commits and pull requests.

## Word lists

The words come from the [EFF's word lists](https://www.eff.org/dice) by the
Electronic Frontier Foundation, under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The files in
`src/lists/` are unchanged from EFF's; the generator skips the words in
`src/lists/excluded.txt`.

## Licence

[MIT](LICENSE), except the word lists above and the icons: the interface icons
are [Lucide](https://lucide.dev)'s (ISC; some derive from Feather, MIT), and the
GitHub mark is [Simple Icons](https://simpleicons.org)' (CC0).
