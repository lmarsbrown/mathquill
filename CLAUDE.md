# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a fork of MathQuill with matrix support. MathQuill is a web formula editor that renders math as you type.

## Build Commands

```bash
# Build (Windows - recommended)
node build.js

# Build (Unix with Make)
make dev          # unminified build
make              # minified build (runs uglify)

# Lint (TypeScript type checking)
make lint
npx tsc --noEmit

# Format
npx prettier --write '**/*.{ts,js,css,html}'

# Test (after building)
make test         # then open test/unit.html and test/visual.html in browser
```

The build concatenates all source files, transpiles TypeScript to ES5, compiles LESS to CSS, and copies fonts to `build/`.

## Architecture

### Tree Structure

MathQuill uses a 1D doubly-linked tree. Key concepts:

- **`L` / `R`**: Direction constants (left/right) used as property keys for sibling pointers
- **`MQNode`** (`src/tree.ts`): Base tree node with `[L]`, `[R]`, `parent`, and `ends` (first/last child)
- **`Point`**: A cursor-like position defined by `parent`, `[L]`, `[R]`
- **`Fragment`**: A contiguous range of sibling nodes

### Math Commands

- **`MathElement`** (`src/commands/math.ts`): Base for all math nodes
- **`MathCommand`**: Commands with child blocks (fractions, exponents, matrices)
- **`MathBlock`**: Editable content container (what cursor navigates within)
- **`DOMView`**: Defines how a command renders to HTML with block placeholders

### Key Services

- **`src/services/parser.util.ts`**: Parser combinator library for LaTeX parsing
- **`src/services/keystroke.ts`**: Keyboard input handling, defines `moveOutOf`, `deleteOutOf`, etc.
- **`src/services/latex.ts`**: LaTeX serialization via `latexMathParser`
- **`src/publicapi.ts`**: External API (`MQ.MathField()`, `.latex()`, `.cmd()`)

### Adding Commands

Commands are registered in `LatexCmds` object. To create a new command:

1. Extend `MathCommand`
2. Define `domView` with `DOMView` for HTML rendering (use `h.block()` for editable regions)
3. Override `latex()` to serialize back to LaTeX
4. Optionally override `parser()` for custom LaTeX parsing
5. Register: `LatexCmds.mycommand = MyCommand;`

### Matrix Implementation (`src/commands/math/matrix.ts`)

The matrix maintains a 2D `cells[][]` array alongside the 1D `blocks[]` array. Key methods:

- `upOutOf` / `downOutOf`: Handle up/down arrow navigation between rows
- `moveOutOf`: Handle left/right navigation between columns
- `keystroke`: Intercepts Enter (add row), comma (add column), Backspace (delete row/column)
- `rebuildDOM`: Reconstructs DOM and updates empty cell states after structural changes
- `parser`: Reads raw content until `\end{...}` then parses cell contents individually

## Test Page

Open `matrix-test.html` in browser after building to test matrix functionality interactively.
