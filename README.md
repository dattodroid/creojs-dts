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

- `perFileOutput: true` → one `.d.ts` file per JSON source plus `index.d.ts`
- `perFileOutput: false` → a single bundled `.d.ts` file
- `input/extra.d.ts` (if present) is appended to generated output
- `input/package.json` (if present) is copied to `creojs/`
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
- `input/extra.d.ts` – Optional custom declarations
- `input/package.json` – Optional package manifest
- `creojs/` – Generated output
