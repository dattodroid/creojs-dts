# creojs-dts

`creojs-dts` generates TypeScript declaration files (`.d.ts`) for the **Creo.JS Toolkit** used by **Creo Parametric**.
Each run produces TypeScript declarations, an `index.d.ts`, and optional package metadata.

## Requirements

- Node.js 18+

## Build

```bash
npm install
npm run build
```

## Generate Declarations

Copy the `idl` folder from:

```text
<CREO_PARAMETRIC>\Common Files\apps\creojs\otk_api_spec\OTK_model.json.zip\json\
```

into:

```text
input/idl/
```

Run:

```bash
npm run generate
```

Generated files are written to `creojs/` (configured in `src/config.ts`).

### Output

- `perFileOutput: true`
  - One `.d.ts` file per JSON source, written under `creojs/<prefix>/<name>.d.ts`
  - `creojs/index.d.ts` references each per-file declaration
- `perFileOutput: false`
  - One bundled `.d.ts` file per module prefix (`creojs/pfc.d.ts`, `creojs/wfc.d.ts`, `creojs/uifc.d.ts`, ...)
  - `creojs/index.d.ts` references each bundled module file
- Per-module extras: `input/pfc.d.ts`, `input/wfc.d.ts`, `input/uifc.d.ts` (if present) are appended to the corresponding generated module output
- Global extras: `input/creojs.d.ts` (if present) is copied to `creojs/creojs.d.ts` and referenced from `creojs/index.d.ts`
- Package metadata: `input/package.json` (if present) is copied to `creojs/`
- The CLI reports the output location and number of processed files

## Configuration

Only behavior settings are loaded from `config.json`. Paths are defined in `src/config.ts`.

Example:

```json
{
  "perFileOutput": true,
  "exportedEnabled": false,
  "useInterfaces": true,
  "docsLevel": "basic"
}
```

### Settings

- `perFileOutput` – Generate one file per JSON source (default: `true`)
- `exportedEnabled` – Add `export` keywords to generated declarations (default: `false`)
- `useInterfaces` – Generate interfaces instead of classes (default: `true`)
- `docsLevel` – Documentation level: `none`, `basic`, or `full` (default: `basic`)

## Project Structure

- `src/app.ts` – CLI entry point and orchestration
- `src/generator.ts` – Generates TypeScript declarations
- `src/docs.ts` – Documentation generation helpers
- `input/idl/` – Source IDL JSON files
- `input/pfc.d.ts`, `input/wfc.d.ts`, `input/uifc.d.ts` – per-module custom declarations
- `input/creojs.d.ts` – Creo.JS declarations
- `input/package.json` – Package manifest
- `creojs/` – Generated output
