# _standard-replicator_

[![Open GitHub issues badge](https://img.shields.io/github/issues/bunnynabbit/standard-replicator)](https://github.com/BunnyNabbit/standard-replicator/issues)
[![Coverage status badge.](https://coveralls.io/repos/github/BunnyNabbit/standard-replicator/badge.svg?branch=main)](https://coveralls.io/github/BunnyNabbit/standard-replicator?branch=main)

> Yu  
> re' 'sites' are "standardized,", huh? But why would you ever want to do that?  
> — _Atypical Originator_

A _standard.site_ document generator for a collection of markdown files. Unlike [_Sequoia_](https://sequoia.pub/), it does not modify any source files. Instead, it creates documents with record keys based on content paths.

Example document: https://pdsls.dev/at://did:plc:rfescy2ghdk6ma2wwwhr3bu2/site.standard.document/quartz

## Setup

- Ensure _Node.js_ is installed. This project was tested on _Node.js_ v24.
- Ensure _pnpm_ is enabled with `corepack enable pnpm`.
- Install dependencies with `pnpm install`.
- Copy `class/Program.example.mjs` to `class/Program.mjs` and configure it.
  - Know your ways? Take advantage of inheritance and extend some methods for extra customization.

probably can run it with `node ./class/Program.mjs`.
