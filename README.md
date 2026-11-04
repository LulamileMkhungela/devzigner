# ProdOps

Product owner: Lulamile Mkhungela.

ProdOps has two distinct parts: the captured public site at `/` and a new role-based product workspace at `/workspace/`. The old workspace is no longer the application entry point. Its source is retained for existing projects and reference; this new workspace uses a separate browser storage key and does not migrate old projects automatically.

## Run the site and workspace

```sh
npm ci
npm run build
npm run preview:site
```

The site server binds to `0.0.0.0:5173` by default; set `PORT` to change it. `npm run dev` runs the workspace in Vite for development. The public site is a local capture, not a live mirror: some captured pages were blocked by Cloudflare and are displayed as notices. It cannot be guaranteed identical to the current Builder Methods site or provide its online services.

## Workspace workflow

The left panel lists role-specific process steps and the resulting `specs/` folders. The workspace includes business/PO, product/UX/UI/CX design, development, quality assurance and delivery/operations. Select a step and ask the configured AI to create a draft. The AI is instructed to ask a focused follow-up only when essential details are missing; it can ask up to three questions. If the brief is clear, it can draft directly. Results depend on the configured model. Roles can start independently; no role has to wait for another to set up the project. Each step can be marked in progress, approved, rejected, or proceed with a revisit, with a note and a suggested next step. Editing approved work, upstream files or shared context marks affected approvals for revisit. These are local workflow aids, not multi-user authorization. Business analysis includes conceptual and logical data, relationships and business rules; the development process includes physical database design and migrations.

Every generated step requires `specs/<role>/<step>/shape.md`, `references.md`, `standards.md` and `plan.md`; the folders appear in the left panel. They are drafts: review and edit them. Every request includes all project Markdown, editable design and solution files, and the complete local skill Markdown library, plus the relevant Agent OS commands. The AI is instructed to apply the skills relevant to the current role. To avoid silently dropping context, generation stops with a message if project context exceeds the supported limit. All 20 local Agent OS commands are mapped to at least one process; this does not mean that an autonomous agent has executed those commands. New skills cover product, experience design, quality and delivery where the repository lacked them. All skills and commands are included in workspace and skills exports. Markdown skills are instructions for an AI, not executable programs.

Attach up to twelve references per project (PDF, PNG, JPEG, WebP or text/source files, 2 MB each and 2.5 MB total; text files up to 20 KB) to individual steps. PDF text is extracted locally from the first 12 pages; scanned PDFs without text should be supplied as images. Images are sent to the provider as image inputs, which requires an image-capable model. All imported text and extracted PDF text is included in project AI context across roles. Up to four images from the current step are included when generating that step. Optionally import a single public GitHub text file by repository URL, branch and path; the server calls GitHub's public API without credentials. This is read-only, does not sync or discover a repository, and GitHub sees the request. Reference files and extracted text are stored in browser storage and included in workspace exports; do not upload sensitive documents without considering provider privacy and local device access.

Each role sees its own deliverables: business and functional requirements for business analysis, design requirements and tokens for design, application files for development, and relevant QA or delivery work for those roles. Other roles see the shared brief and business requirements as a read-only handoff, labelled with the originating step's current status; development and QA also see design requirements. Each role can add its own context without overwriting the shared brief. An approval is a local recorded decision, not authentication or an automatic sign-off. Requirements and context marked **Example template** are editable placeholders, not verified facts. New projects include templates for business, functional and design requirements and a starter design system; use **Use step template** to add missing starter documents for any process without overwriting existing files.

The design role's **Design system & tokens** step has editable named colors, a sample component preview, a starter component guide and JSON/CSS token files. You can remove the starter and import named six-digit hex colors from JSON; unsupported formats are not imported. Changes to colors and radius automatically update `solution/styles.css` only when it contains the ProdOps token block; components must use those CSS variables. Hard-coded colors and arbitrary imported component systems do not automatically change. The example dashboard uses the variables. Verify contrast and accessibility. This is not a full visual screen editor.

Development can create or import individual HTML, CSS, SCSS, JS, TS, JSX, TSX, JSON or Markdown files into `solution/` (up to 30 files at a time, 50 KB each; folder paths are not retained). Selecting an HTML file shows its own static preview beside the editor; CSS shows the related page and scripts do not execute. TypeScript, Angular, React and SCSS cannot be compiled or rendered in this workspace; an external development environment is needed for those. Editing, templates, previews and exporting do not require Claude.

The workspace export contains files, readable role-context notes, reference originals, project state, skills, commands and readable HTML versions of generated shape documents. Solution-only export includes files under `solution/`. Import a full ZIP into another browser using its project snapshot; edits made directly to individual ZIP entries are not imported. Project history and the active project are saved in local browser storage, not on a shared server or in Git. Use the project dropdown and plus button to switch or create projects; importing a workspace ZIP adds a separate project. The earlier single-studio project is migrated into this history when possible. Storage limits vary; watch the save indicator and export backups. There are no accounts, live multi-user collaboration, Git branches/worktrees, screenshot capture, repository discovery, a general-purpose development runtime, or automatic test execution in this version. Do not enter secrets into project documents.

## Connect Claude and Figma in the workspace

Open **Connect Claude & Figma** at the top of the workspace. Paste an Anthropic API key and select a model ID; **Connect Claude** sends a small test request, which may incur a charge. A Claude subscription is not itself an API key. Paste a Figma personal access token with `file_content:read`; the key is marked unverified until you test or import a selected frame. The token must also have access to the file. Keys take precedence over any server-configured provider for that tab; disconnect to use the server-configured integration again.

Keys are kept only in the current tab's application memory, not browser project storage or ZIP exports. Reloading or closing the tab removes them. Requests carrying a personal key are accepted only from same-origin HTTPS (or localhost HTTP for development). **The ProdOps server receives the keys** and forwards them to fixed Anthropic or Figma API hosts. Only enter keys on a server you trust. Operators must use HTTPS, prevent logging credential headers and request bodies, and add suitable authentication and rate limiting for deployed services. Same-origin checks are not user authentication; browser memory is not protection against a compromised site or extensions. Do not share keys in project text or screenshots.

The direct Anthropic Messages API is used, not a Claude Code CLI, OAuth session or ChatGPT subscription. The test checks the key's access to the chosen model, not the quality of future generation. Your API provider may charge for generation and tests. The browser never chooses the API host, and provider redirects are refused. A server operator may still optionally configure a shared provider via environment variables as described below; server configuration is not required for personal-key use.

For Figma, paste a selected frame link (with `node-id`) into **Tell the AI what you need**, or choose **Add a reference → Figma frame → Import or refresh frame**. ProdOps reads the selected node via Figma's REST API, saves a bounded Markdown summary of layout, colors, text, typography and available properties, and sends it to the configured AI as untrusted context. Import again to refresh. A successful frame test verifies access to that frame, not every file. This read-only integration is not MCP or OAuth and does not give unrestricted Figma access. The import is limited to four levels, 180 nodes, 2 MB of API response and approximately 18,000 characters; complex frames may be incomplete. It does not download Figma images or render the Figma canvas.

Upload a screenshot separately to compare with the static HTML/CSS preview. The live editor and comparison preview are sandboxed with scripts and external assets disabled: they are not running Angular/React apps, automated visual diffs or shared live sessions. For trusted plain HTML/JavaScript projects, an optional interactive preview executes only `solution/app.js` with `solution/index.html` and CSS in an isolated sandbox; storage is unavailable, external resources are restricted, the frame can navigate itself, and code can consume browser resources. Never run untrusted code. The workspace does not compile frameworks, run tests or ship changes.

To reuse an Angular or other component system, use **Add a reference** to upload multiple `.ts`, `.html`, `.scss`, `.css`, and other supported text files (20 KB per text file), select **Angular** or another frontend style and ask the AI to follow them. The AI can draft editable files in `solution/` during the development implementation step or `design/components/` during design screens; it does not install Angular packages, compile, run tests or guarantee that output matches the original system. Review and build the exported files in an appropriate IDE. This workflow does not connect arbitrary component registries or run Angular locally.

## Orbit dashboard example

Orbit is a fictional delivery dashboard with business and functional requirements, design requirements, named tokens, a component guide, editable code and example work across all five roles. Open the dashboard from the project picker, then choose a role to see its relevant work. In Development, **Try the dashboard** runs the current HTML/CSS/JavaScript in an isolated browser preview; filter work and mark tasks done or reopen them. Data is fictional and in memory; changes to tasks reset on reload. The example has no real users, accounts, shared backend or deployment. Its approvals, research and release checks are illustrative, not real evidence. Any older CASA project already in browser history is retained as a normal saved project so edits are not deleted.

## Optional server-wide AI setup

Instead of personal keys, an administrator can configure an OpenAI-compatible chat-completions API (which can use OpenAI models) or the Anthropic Messages API (Claude) for a trusted, protected server. Existing ChatGPT, Claude and Codex browser accounts are not connected automatically. Without a provider, the dashboard example, manual editing and exports still work.

Example for an OpenAI-compatible API:

```sh
export PRODOPS_AI_PROVIDER="openai-compatible"
export PRODOPS_AI_URL="https://api.openai.com/v1/chat/completions"
export PRODOPS_AI_MODEL="your-model-name"
export PRODOPS_AI_API_KEY="your-provider-key"
export PRODOPS_AI_TRUSTED_LOCAL="1"
npm run build && npm run preview:site
```

For Anthropic, set `PRODOPS_AI_PROVIDER=anthropic`, `PRODOPS_AI_URL=https://api.anthropic.com/v1/messages` and the appropriate model and API key. Local OpenAI-compatible model servers may use HTTP on `localhost`, `127.0.0.1` or `[::1]`, without an API key. For this server-wide option, the provider key remains on the server; no access-password prompt is shown in the workspace. Requests go through same-origin `/api/studio`; the provider receives the brief, all project Markdown, editable design and solution files, all skill Markdown, imported text references, role-specific context, previous answers and current-step images. Some models may not support the prompt size, images or structured output.

**Security:** `PRODOPS_AI_TRUSTED_LOCAL=1` explicitly opts into a server with no application-level user authentication or rate limiting. Use it only in a trusted local environment or behind separately configured authentication and spending limits; do not expose a configured provider to the public. The same-origin check alone is not authentication. Existing agent subscriptions and browser logins are not shared with this server.

If your network uses a trusted system TLS proxy, start Node with `NODE_USE_SYSTEM_CA=1` on supported Node versions so provider and GitHub HTTPS certificates validate; do not disable certificate validation.

This is intended for a trusted single-user environment. The same-origin check is not production authentication, authorization, rate limiting, spending controls or multi-user isolation. Use HTTPS and a protected server for deployment, and consider provider privacy and costs. Manual editing and exports work without a model.

## Checks

```sh
npm run build
npm run test:studio
```
