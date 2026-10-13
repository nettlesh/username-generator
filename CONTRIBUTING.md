# Contributing

Run `mise install --locked` and `mise run install` to set up; `mise run check`
and `mise run test` verify a change. [Agent instructions](AGENTS.md) hold the
coding standards.

## Commits

- Use [Conventional Commits](https://www.conventionalcommits.org/), unscoped.
  The `commit-msg` hook checks the format.
- Write messages for a reader who has only the repository: what changed and why,
  in as few words as that takes. Leave out untracked plans, review history, and
  test results.
- Preserve the human author. Add a `Co-authored-by` trailer only for the agent
  doing the work, using its authoritative account; the address is what links the
  trailer to that account:
  - Codex: `Co-authored-by: Codex <noreply@openai.com>`.
  - Claude: `Co-authored-by: Claude <noreply@anthropic.com>`; a model-specific
    display name may use the same address.
- Ask for the authoritative account if the agent is not listed; never invent an
  address.

## Pull requests

- Target `main`. The title is a Conventional Commit, since squash merging makes
  it the commit.
- Describe what changes and why, what you ran, and what you checked in the
  browser, with screenshots for visible changes.
- Run `mise run check` and `mise run test`, and report results as they are.

## AI disclosure

When AI contributes GitHub content, such as an issue, a pull request
description, a review, or a comment, its last line names each agent and the
model it ran, in italics, earliest first and separated by commas:

`_Assisted-by: <agent>:<model>_`, such as
`_Assisted-by: Claude Code:claude-opus-5-5, Codex:gpt-6.1-sol_`.

Use the model your runtime reports, never a guess, and keep the agents named
before you. Commits carry the `Co-authored-by` trailer above instead, one for
each agent.
