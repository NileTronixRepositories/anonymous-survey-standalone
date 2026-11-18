Voice persistence is blocked on a confirmed backend upload contract.

The public [AnonTemplatesController](https://github.com/NileTronixRepositories/CustomerSurvey/blob/master/CustomerSurvey.Api/Controllers/AnonTemplatesController.cs) accepts `VoiceFileName`, with no audio file parameter. The Angular recorder/file picker creates local object URLs; it never uploads the audio bytes. Repository searches found an internal media service but did not establish a supported anonymous audio upload endpoint.

The frontend retains local recording, selection, playback and object URL cleanup. Local audio is clearly identified as a preview and cannot satisfy a required Voice question or produce a submitted reference. An optional Voice question can be skipped after removing its local preview.

Creating a backend issue was attempted during implementation, but the GitHub integration returned HTTP 403 (`Resource not accessible by integration`). No backend issue was created. A real backend test environment and the approved upload contract are still required for end-to-end verification.

Backend issue to create in [CustomerSurvey](https://github.com/NileTronixRepositories/CustomerSurvey/issues):

**[Backend] Define anonymous survey audio upload and persisted voice reference contract**

Frontend dependency: [anonymous-survey-standalone](https://github.com/NileTronixRepositories/anonymous-survey-standalone).

Confirm an existing supported endpoint or define the anonymous audio upload request and server reference response. Specify template/respondent scoping, accepted formats and size limits, storage, validation, upload errors, cancellation and orphan cleanup. Preserve the existing submission contract unless a backend change is explicitly agreed.

Acceptance criteria:

- Recorded and selected audio bytes persist through an approved backend mechanism.
- The returned server reference is accepted as `voiceFileName` and is scoped to the correct respondent/template.
- Failed/cancelled uploads and temporary resource cleanup are documented and tested.
- Angular submits only a server-confirmed reference and is verified against a real backend environment.

Focused frontend regression checks: `node tests/run-compatibility-tests.mjs`. These use the existing Angular build toolchain and Node test runner without adding dependencies. Production compilation: `npm run build`.

Browser checks: start the application with `npm start`, then run `node tests/public-survey.browser.mjs` with an existing Playwright installation available. If it is installed outside this project, set `PLAYWRIGHT_MODULE` to its package directory. The browser check uses installed Microsoft Edge and mocked API responses; it covers Arabic/English, 390px/1440px widths, dropdown persistence, keyboard rating selection, optional questions, date serialization and success navigation. Screenshots are saved under `.angular/`. This does not verify a live backend.
