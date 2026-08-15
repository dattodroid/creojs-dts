# creojs-dts

`creojs-dts` is a TypeScript definition generator (.d.ts) for the Creo.JS Toolkit from Creo Parametric. Each run emits TypeScript declaration files plus supporting `@types` metadata (per-file `.d.ts`, an `index.d.ts`, and an optional `package.json`) in the configured output folder.

## Install & Build

### Requirements

- Node.js 18+

### Install dependencies

```bash
npm install
```

### Build the generator

```bash
npm run build
```

## Usage

Copy the `idl` directory from `<CREO_PARAMETRIC>\Common Files\apps\creojs\otk_api_spec\OTK_model.json.zip\json\` into `input/`.

```bash
npm run generate
```

After a successful run the generator writes `.d.ts` files to the `creojs/` output folder (paths are defined directly in `src/config.ts`).

- With `perFileOutput: true`, each JSON file produces `outputFolder/<jsonName>.d.ts`, and the CLI writes an `outputFolder/index.d.ts` containing triple-slash references to those files.
- With `perFileOutput: false`, all JSON sources are merged into a single bundle named `outputFolder/<defaultOutputFile>`.
- When present, `input/extra.d.ts` is appended verbatim to every generated declaration.
- If `input/package.json` exists, it is copied into the `outputFolder` to match the generated declarations.

Successful runs report the output path and the number of processed JSON files.


## Configuration hints

### `config.json`

The path-related settings (`inputPath`, `outputFolder`, `defaultOutputFile`, and `extraDtsPath`) are hard-coded in `src/config.ts`. Update that source file if you need different locations.

`config.json` continues to drive the behavioral toggles below:

| Key | Description | Default |
| --- | --- | --- |
| `perFileOutput` | When `true`, every JSON source emits its own `<jsonName>.d.ts`. When `false`, all sources are merged into a single file. | `true` |
| `exportedEnabled` | Enable `export` keywords on generated declarations (useful for module-based consumption). | `false` |
| `useInterfaces` | Emit IDL objects as TypeScript interfaces (`true`) or classes (`false`). | `true` |
| `docsLevel` | Controls how much source documentation is preserved (`none`, `basic`, `full`). | `basic` |

- `docsLevel` accepts `none`, `basic`, or `full` to control summary, tag, and parameter documentation detail.
- Toggle `useInterfaces`/`exportedEnabled` when you require class-based declarations or exported symbols.

## Project layout

| Path | Description |
| --- | --- |
| `src/app.ts` | CLI entry point: discovers the input files, orchestrates generation, and writes the final `output/*.d.ts` file. |
| `src/generator.ts` | Core generator that converts declarations into ts-morph structures (interfaces, classes, enums, unions, etc.). |
| `src/docs.ts` | Helpers for shaping documentation comments and `@tag`s; controlled by the internal `DOCS_LEVEL` flag. |
| `input/idl/` | Source directory for Creo IDL JSON. |
| `input/extra.d.ts` | Optional hand-authored declarations appended to the generated output. |
| `input/package.json` | Optional manifest copied into the generated folder (handy for `@types` packaging). |
| `<outputFolder>/` | Destination for the resulting `.d.ts` files (defaults to `creojs/`, but configurable). |


