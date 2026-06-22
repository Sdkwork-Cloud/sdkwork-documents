# Repository Guidelines

<!-- SDKWORK-AGENTS-GENERATED: v2 -->

## SDKWORK Soul

Read `../../../sdkwork-specs/SOUL.md` before executing tasks in this app surface.

## SDKWORK Standards

Canonical SDKWORK specs path from this app surface:

- `../../../sdkwork-specs/README.md`
- `../../../sdkwork-specs/SOUL.md`
- `../../../sdkwork-specs/AGENTS_SPEC.md`
- `../../../sdkwork-specs/PNPM_SCRIPT_SPEC.md`

## Application Identity

This is the PC browser/desktop app surface for SDKWork Documents. Read `../../sdkwork.app.config.json` when the task touches app identity, runtime config, SDK wiring, release metadata, packaging, or deployment.

## Local Dictionary Structure

- `AGENTS.md`: app-surface agent entrypoint.
- `package.json`: app-surface scripts governed by `PNPM_SCRIPT_SPEC.md`.
- `.env.example`: safe app-surface runtime env template.

## Required Specs By Task Type

- Frontend/UI code: `../../../sdkwork-specs/FRONTEND_CODE_SPEC.md`, `../../../sdkwork-specs/APP_PC_ARCHITECTURE_SPEC.md`, `../../../sdkwork-specs/APP_PC_REACT_UI_SPEC.md`.
- SDK integration: `../../../sdkwork-specs/APP_SDK_INTEGRATION_SPEC.md`, `../../../sdkwork-specs/SDK_SPEC.md`.

## Build, Test, and Verification

Run app-surface commands from this directory when the task is limited to this surface:

- `pnpm dev` — Vite dev server only (requires backend at topology URLs)
- `pnpm build` — production browser bundle

From the repository root:

- `pnpm dev:browser` — topology-aware backend + PC Vite dev (`http://127.0.0.1:3902`)
- `pnpm dev:browser:postgres:unified-process:standalone:local` — PC Vite only when backend is already running
- `pnpm verify` — cross-surface validation including `build:browser`
