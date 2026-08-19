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

Copy from `<CREO_PARAMETRIC>\Common Files\apps\creojs\otk_api_spec\OTK_model.json.zip\json\`

* the `idl/` folder into `input/idl/` as `pfc/`
* the `idl_wfc/` folder into `input/idl/` as `wfc/`
* the `idl_uifc/` folder into `input/idl/` as `uifc/`

Run:

```bash
npm run generate
```

Generated files are written to `creojs/`.

### Output

- `perFileOutput: true`
  - One `.d.ts` file per JSON source, written under `creojs/<module>/<name>.d.ts`
  - `creojs/index.d.ts` references each per-file declaration
- `perFileOutput: false`
  - One bundled `.d.ts` file per module prefix (`creojs/pfc.d.ts`, `creojs/wfc.d.ts`, `creojs/uifc.d.ts`, ...)
  - `creojs/index.d.ts` references each bundled module file
- Per-module extras: `input/pfc.d.ts`, `input/wfc.d.ts`, `input/uifc.d.ts` (if present) are appended to the corresponding generated module output
- Creo.JS global extras: `input/creojs.d.ts` is copied to `creojs/creojs.d.ts` and referenced from `creojs/index.d.ts`
- Package metadata: `input/package.json` is copied to `creojs/`
- The CLI reports the output location and number of processed files

## Configuration

Only behavior settings are loaded from `config.json`. Input (`input/`) and output (`creojs/`) path are hardcoded

Example:

```json
{
  "perFileOutput": false,
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
