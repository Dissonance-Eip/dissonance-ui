# Renderer Architecture (OOP)

This UI is organized as a small OOP/MVC-ish structure where:

- **Controllers** orchestrate flows and side effects.
- **Views** own DOM bindings and view-level UI updates.
- **Components** are reusable UI building blocks.
- **Services** implement pure(ish) domain logic.
- **Infrastructure** wraps platform/bridge concerns.

## Folder map

- `renderer/app/`
  - `bootstrap.js`: composition root for the renderer.
- `renderer/base/`
  - `Disposable.js`: tracks cleanups/unsubscribes.
  - `BaseController.js`, `BaseView.js`, `BaseComponent.js`: lifecycle + safe event wiring.
  - `BaseApi.js`: safe bridge method calling.
- `renderer/infrastructure/`
  - `DissonanceApi.js`: preload bridge wrapper.
  - `TerminalLogger.js`: logs to main process or console.
  - `ViewRouter.js`: toggles views by name.
- `renderer/controllers/`
  - `AppController.js`: application orchestration.
- `renderer/views/`
  - `WelcomeView.js`, `MainView.js`: view-specific UI updates and event wiring.
- `renderer/components/`
  - `DropZone.js`: reusable drag/drop + click-to-open component.
- `renderer/services/`
  - `WavMetadataService.js`: metadata normalization (duration/channels/sample-rate, etc).
- `renderer/state/`
  - `AppState.js`: minimal app state.
- `renderer/utils/`
  - `pathUtils.js`: small helpers.

## Conventions

- **No business logic in views/components.** Put it in `services/`.
- **Controllers**:
  - Wire events between views/components.
  - Call `api` methods.
  - Update `state`.
  - Decide what to render.
- **Lifecycle**:
  - Anything that subscribes (event listener, IPC callback) should be tracked via `track()` so it is cleaned up on `unmount()`/`stop()`.

## Example: adding a new feature

1. Add logic in a service (`renderer/services/...`).
2. Add UI wiring in a view/component.
3. Orchestrate it in a controller.

Keep `renderer/app/bootstrap.js` as the only place that constructs and wires all dependencies.
