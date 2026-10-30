// ProdOps — developed by Lulamile Mkhungela.
//
// The Builder Methods canon, inside ProdOps.
//
// Builder Methods (buildermethods.com, Brian Casel) is four things: eight free
// tools, the Agent OS and Design OS workflows, a Pro library of courses, video
// series, workshops and build kits, and a written archive of articles. ProdOps
// already ships the tools and the workflows as files; this module brings the
// rest — the kits, the series, the sessions, the courses, the articles — into
// the workspace as data, so nothing that exists upstream has to be a page you
// leave the app to read.
//
// Where the data came from, so it can be checked rather than trusted:
//
//   tools          https://buildermethods.com/tools       (8 entries)
//   agent os       https://buildermethods.com/agent-os/v2 (workflow + concepts)
//   design os      https://buildermethods.com/design-os   (workflow + docs)
//   kits           https://buildermethods.com/kits        (6 kits)
//   series         https://buildermethods.com/library/series (6 series, 133 videos)
//   videos         https://buildermethods.com/library/all (catalogue snapshot)
//   sessions       https://buildermethods.com/sessions    (workshops + replays)
//   courses        https://buildermethods.com/courses     (4 courses, Pro)
//   articles       https://buildermethods.com/articles    (21 posts)
//
// Scraped 2026-10-30. Counts are asserted by `npm run check` against the arrays
// below, so a row that disappears from this file fails the build rather than
// quietly shrinking the library.

export const SCRAPED = '2026-10-30'
export const SOURCE = 'https://buildermethods.com'

export interface Series {
  id: string
  title: string
  blurb: string
  lessons: number
  /** The ProdOps stage this series teaches. */
  stage: string
}

export interface Video {
  slug: string
  title: string
  blurb: string
  tags: string[]
  series?: string
}

export interface Kit {
  id: string
  name: string
  blurb: string
  tags: string[]
  /** The ProdOps archetype the kit compiles from. */
  archetypeId: string
  /** What "Start this kit" writes into the description field. */
  idea: string
  /** The pre-shaped artefacts the kit ships with. */
  includes: string[]
}

export interface Session {
  slug: string
  title: string
  blurb: string
  /** ISO date, or the season label for a replay. */
  when: string
  kind: 'Live' | 'Replay' | 'On demand'
}

export interface Course {
  id: string
  title: string
  blurb: string
  lessons: number
  series: string
}

export interface Article {
  slug: string
  title: string
  date: string
  blurb: string
}

/* ------------------------------------------------------------------ series */

export const SERIES: Series[] = [
  {
    id: 'become-ai-native',
    title: 'Become AI-Native',
    blurb: 'Work faster, think sharper, and create more, with AI woven through everything you do.',
    lessons: 27,
    stage: 'Workspace',
  },
  {
    id: 'become-the-builder',
    title: 'Become the Builder',
    blurb:
      'The missing on-ramp for building real apps with AI — the foundations, the stack, the template, and your first deployed app.',
    lessons: 33,
    stage: 'Product',
  },
  {
    id: 'claude-code-course',
    title: 'Build with Claude Code',
    blurb: 'Dive into the course on building with Claude Code.',
    lessons: 27,
    stage: 'Sections',
  },
  {
    id: 'ride-alongs',
    title: 'Ride-Alongs',
    blurb: 'Come along as we build and ship real products using AI.',
    lessons: 19,
    stage: 'Export',
  },
  {
    id: 'builder-stories',
    title: 'Builder Stories',
    blurb: "Interviews with builders sharing their screens & their stories of how they build with AI.",
    lessons: 3,
    stage: 'Product',
  },
  {
    id: 'openclaw',
    title: 'Multi-Agent OpenClaw',
    blurb: 'Build a team of agents with OpenClaw.',
    lessons: 15,
    stage: 'Workspace',
  },
]

/* ------------------------------------------------------------------ videos */

/**
 * The catalogue snapshot: the newest videos on `/library/all`, newest first.
 *
 * The full library is 133 videos across the six series above; `/library/all`
 * paginates, so this is the first page of it rather than an invented sample.
 * Every row carries the title, the one-line brief and the tags the page shows.
 */
export const VIDEOS: Video[] = [
  {
    slug: 'ai-costs',
    title: 'AI costs',
    blurb:
      'How AI pricing is structured, tokens versus subscriptions, how I mix models and plans, and the progression I recommend as your usage grows.',
    tags: ['Claude.ai', 'ChatGPT', 'Costs'],
    series: 'become-ai-native',
  },
  {
    slug: 'github-repos-explained',
    title: 'GitHub repos, explained',
    blurb:
      'What a repo is, why syncing to GitHub is worth it, the three words you need (commit, push, pull), and the one thing that must never go in a repo.',
    tags: ['Claude Code', 'Git', 'GitHub'],
    series: 'become-the-builder',
  },
  {
    slug: 'agentic-apps-and-harnesses',
    title: 'Agentic apps & harnesses',
    blurb:
      'How to make sense of the AI apps out there: chat apps vs file-based apps, UIs vs terminals, agent bots, and the three ways an agent reaches your other tools.',
    tags: ['Claude Code', 'Cursor', 'Claude.ai'],
    series: 'become-ai-native',
  },
  {
    slug: 'file-types-for-ai',
    title: 'File types for AI',
    blurb:
      'Markdown, JSON, HTML, YAML, and scripts: what each file type you saw in the course is for, and why none of them belongs to a company.',
    tags: ['Claude Skills', 'Markdown', 'HTML'],
    series: 'become-ai-native',
  },
  {
    slug: 'agent-employee-patterns',
    title: 'Agent employee patterns',
    blurb:
      "The third pattern lesson names the course's biggest idea, the agent employee, assembles the whole AI-native operating model, and hands the loop over to you.",
    tags: ['Mindset', 'Claude Skills', 'AI-Native'],
    series: 'become-ai-native',
  },
  {
    slug: 'async-interactive-agents',
    title: 'Async interactive agents',
    blurb:
      'Turn the daily report into a two-way command surface: the agent recommends and leaves you checkboxes, you tick or scribble, and the next run carries it out.',
    tags: ['Claude Code', 'Claude Skills', 'Claude Cowork'],
    series: 'become-ai-native',
  },
  {
    slug: 'automate-agent-tasks',
    title: 'Automate agent tasks',
    blurb:
      'The same three skills, run by a scheduler instead of by you: hourly intake, a daily report, a weekly report, and a week that runs while you do nothing.',
    tags: ['Claude Skills', 'Claude Cowork', 'Sales'],
    series: 'become-ai-native',
  },
  {
    slug: 'html-sales-dashboard',
    title: 'HTML sales dashboard',
    blurb:
      'A visual board that reads the repo: one HTML page, no app, no database, no server, kept fresh by a skill that other skills call.',
    tags: ['Claude Code', 'Claude Skills'],
    series: 'become-ai-native',
  },
  {
    slug: 'daily-report-skill',
    title: 'Daily report skill',
    blurb:
      "The fix for sifting: two report skills that surface what needs you, plus the first skill that calls another skill, then the rest of the week's inbound.",
    tags: ['Claude Code', 'Claude Skills'],
    series: 'become-ai-native',
  },
  {
    slug: 'leads-intake-skill',
    title: 'Leads intake skill',
    blurb:
      'Build the intake skill that files every inbound item, then run it on two days of forms, emails, voicemails, and a call transcript.',
    tags: ['Claude Code', 'Claude Skills'],
    series: 'become-ai-native',
  },
  {
    slug: 'sales-pipeline-repo',
    title: 'Sales Pipeline Repo',
    blurb:
      'A CRM with no app, no database, and no server, from one prompt: six numbered stage folders, eight prospects filed into their stages from a seed doc, and an AGENTS.md that tells any agent how the pipeline works.',
    tags: ['Claude Code', 'Markdown', 'AGENTS.md'],
    series: 'become-ai-native',
  },
  {
    slug: 'training-ai-with-taste',
    title: 'Training AI with taste',
    blurb:
      'The second pattern lesson makes the course-wide voice thread explicit: two mechanisms, a self-check, where the training lives, and the kit for doing it on your own work.',
    tags: ['Mindset', 'Claude Skills', 'Training'],
    series: 'become-ai-native',
  },
  {
    slug: 'ai-sales-pipeline',
    title: 'AI Sales Pipeline',
    blurb:
      'A quick tour of the third example, a managed IT provider with founder-led sales, and the biggest build in the course: a sales assistant with a real job.',
    tags: ['AI-Native', 'Sales', 'CRM'],
    series: 'become-ai-native',
  },
  {
    slug: 'mcp-and-agent-skills',
    title: 'MCP & Agent Skills',
    blurb:
      'The last mile: add a push step so the finished issue lands in your email platform as a draft, then swap platforms and watch nothing in the skill change.',
    tags: ['Claude Code', 'Claude Skills', 'Human in the Loop'],
    series: 'become-ai-native',
  },
  {
    slug: 'voice-training-for-ai',
    title: 'Voice training for AI',
    blurb:
      'Point the agent at nine finished issues to build a voice doc, seed a slop list by hand, wire both into the skill with a self-check, and run it again.',
    tags: ['Claude Code', 'Claude Skills', 'Markdown'],
    series: 'become-ai-native',
  },
  {
    slug: 'content-drafting-skill',
    title: 'Content drafting skill',
    blurb:
      'We build a newsletter drafting skill that interviews you before it writes, run it on a raw voice memo, and read a draft that has the right shape and none of the voice.',
    tags: ['Claude Code', 'Claude Skills'],
    series: 'become-ai-native',
  },
  {
    slug: 'content-development-repo',
    title: 'Content development repo',
    blurb:
      'An empty folder becomes the working home for the newsletter: nine finished issues, raw idea captures, brand docs, and an AGENTS.md that explains it all.',
    tags: ['Claude Code', 'Markdown', 'AGENTS.md'],
    series: 'become-ai-native',
  },
  {
    slug: 'agent-skills-patterns',
    title: 'Agent Skills Patterns',
    blurb:
      'The first pattern lesson names what you just watched: the loop, where skills live, the anatomy of a skill, the interview convention, and the three improvement moves.',
    tags: ['Mindset', 'Workflow', 'Claude Skills'],
    series: 'become-ai-native',
  },
  {
    slug: 'grow-your-skills-library',
    title: 'Grow your skills library',
    blurb:
      'Kill the modules nobody used, promote the sections you kept asking for, and run the skill clean: real usage rewrote the design in one pass.',
    tags: ['Claude Code', 'Workflow', 'Claude Skills'],
    series: 'become-ai-native',
  },
  {
    slug: 'friction-driven-iterations',
    title: 'Friction-driven iterations',
    blurb:
      'We run the modular skill on two new prospects and let it hit the limits of the library on camera, patching each run by hand and noticing what keeps coming up.',
    tags: ['Claude Code', 'Workflow', 'Claude Skills'],
    series: 'become-ai-native',
  },
  {
    slug: 'customizing-standards-with-profiles',
    title: 'Customizing standards with profiles',
    blurb: 'How profiles carry standards, and how inheritance keeps them from drifting between projects.',
    tags: ['Agent OS', 'Standards', 'Profiles'],
    series: 'claude-code-course',
  },
  {
    slug: 'agent-os-v3-tutorial',
    title: 'Agent OS v3 tutorial',
    blurb: 'A full walkthrough of the Agent OS workflow, command by command, on a real feature.',
    tags: ['Agent OS', 'Workflow'],
    series: 'claude-code-course',
  },
  {
    slug: 'design-os-tutorial',
    title: 'Design OS tutorial',
    blurb: 'The Design OS flow end to end: product planning, data shape, design tokens, sections, screens, export.',
    tags: ['Design OS', 'Workflow', 'Design'],
    series: 'claude-code-course',
  },
  {
    slug: 'claude-code-skills',
    title: 'Claude Code Skills',
    blurb: 'What a Skill is, where it lives, and why the description decides whether it ever fires.',
    tags: ['Claude Code', 'Claude Skills'],
    series: 'claude-code-course',
  },
]

/* -------------------------------------------------------------------- kits */

/**
 * The six Build Kits — Builder Methods' "solutions".
 *
 * A kit upstream is a pre-shaped app: a PRD, a stack, a design system and
 * milestone prompts, plus video guides. Here each one is also a start state for
 * ProdOps: pressing Start writes the kit's description into the Product stage and
 * compiles the kit's archetype, so the pre-shaped spec has somewhere to land.
 */
export const KITS: Kit[] = [
  {
    id: 'simple-crm-build-kit',
    name: 'Simple CRM Build Kit',
    blurb:
      'A pre-shaped Build Kit to build your own CRM app with contacts, deals, and a kanban pipeline. Build it yourself with any AI coding agent.',
    tags: ['CRM', 'KanBan'],
    archetypeId: 'crm',
    idea:
      'A simple CRM for a small sales team: contacts, deals and a kanban pipeline where every deal moves stage by stage',
    includes: ['PRD', 'Tech stack', 'Design system', 'Milestone prompts', 'Video guides'],
  },
  {
    id: 'time-tracking-invoicing-app-build-kit',
    name: 'Time Tracking & Invoicing App Build Kit',
    blurb:
      'A pre-shaped Build Kit for building your own hourly time-tracking and invoicing app with AI coding agents.',
    tags: ['Time tracking', 'Invoicing'],
    archetypeId: 'fintech',
    idea:
      'An hourly time-tracking app for a small studio that turns tracked hours into invoices and follows each invoice until it is paid',
    includes: ['PRD', 'Tech stack', 'Design system', 'Milestone prompts', 'Video guides'],
  },
  {
    id: 'markdown-notes-app-build-kit',
    name: 'Markdown Notes App Build Kit',
    blurb:
      'A pre-shaped Build Kit for shipping your own capture-first markdown notes app with AI coding agents.',
    tags: ['Markdown', 'Notes'],
    archetypeId: 'saas',
    idea:
      'A capture-first notes app in markdown: quick capture, folders, search, and a workspace that stays out of the way',
    includes: ['PRD', 'Tech stack', 'Design system', 'Milestone prompts', 'Video guides'],
  },
  {
    id: 'bookmark-manager-build-kit',
    name: 'Bookmark Manager Build Kit',
    blurb:
      'A pre-shaped Build Kit for shipping your own bookmark manager with AI coding agents — PRD, tech stack, design system, and milestone prompts included.',
    tags: ['Bookmarks', 'Collections'],
    archetypeId: 'creator',
    idea:
      'A bookmark manager that saves links into collections, tags them, and makes the saved pile searchable again',
    includes: ['PRD', 'Tech stack', 'Design system', 'Milestone prompts', 'Video guides'],
  },
  {
    id: 'real-estate-crm-build-kit',
    name: 'Real Estate CRM Build Kit',
    blurb: 'A pre-shaped Build Kit for building your own real estate CRM with AI coding agents.',
    tags: ['CRM', 'KanBan', 'Real estate'],
    archetypeId: 'property',
    idea:
      'A real estate CRM for a small agency: properties, buyers and sellers, viewings, and a pipeline from first call to signed lease',
    includes: ['PRD', 'Tech stack', 'Design system', 'Milestone prompts', 'Video guides'],
  },
  {
    id: 'content-pipeline-app-build-kit',
    name: 'Content Pipeline App Build Kit',
    blurb:
      'A pre-shaped Build Kit for shipping your own self-hosted, agent-native content pipeline with AI coding agents.',
    tags: ['KanBan', 'Content', 'Agents'],
    archetypeId: 'creator',
    idea:
      'A self-hosted, agent-native content pipeline: ideas, drafts and published posts moving across a board an agent can read and move',
    includes: ['PRD', 'Tech stack', 'Design system', 'Milestone prompts', 'Video guides'],
  },
]

/* ---------------------------------------------------------------- sessions */

export const SESSIONS: Session[] = [
  {
    slug: '11-03-26-projects-qa',
    title: 'Projects Q&A',
    blurb: "Members show what they're building and get live feedback from Brian and the group.",
    when: '2026-11-03',
    kind: 'Live',
  },
  {
    slug: '12-10-26-projects-qa',
    title: 'Projects Q&A',
    blurb: "Members show what they're building and get live feedback from Brian and the group.",
    when: '2026-12-10',
    kind: 'Live',
  },
  {
    slug: 'building-with-agents-in-the-cloud',
    title: 'Building with agents in the cloud',
    blurb:
      'A live workshop on moving your projects to the cloud, organizing your repos, and orchestrating multiple agents.',
    when: 'Fall ’26',
    kind: 'Replay',
  },
  {
    slug: '06-11-26-projects-qa',
    title: 'Projects Q&A',
    blurb: "Members show what they're building and get live feedback from Brian and the group.",
    when: 'Summer ’26',
    kind: 'Replay',
  },
  {
    slug: '05-28-26-new-builds',
    title: 'New Builds',
    blurb: 'Members share their greenfield projects and get fresh perspectives on early-stage decisions.',
    when: 'Spring ’26',
    kind: 'Replay',
  },
  {
    slug: '04-30-26-team-talk',
    title: 'Team Talk',
    blurb: 'Real talk for teams adopting AI — challenges, strategies, and what’s working.',
    when: 'Spring ’26',
    kind: 'Replay',
  },
  {
    slug: '08-13-26-projects-qa',
    title: 'Projects Q&A',
    blurb: 'Another round of live project reviews from the group.',
    when: 'Summer ’26',
    kind: 'Replay',
  },
  {
    slug: '05-14-26-projects-qa',
    title: 'Projects Q&A',
    blurb: 'Another round of live project reviews from the group.',
    when: 'Spring ’26',
    kind: 'Replay',
  },
  {
    slug: '04-09-26-projects-qa',
    title: 'Projects Q&A',
    blurb: 'Another round of live project reviews from the group.',
    when: 'Spring ’26',
    kind: 'Replay',
  },
  {
    slug: 'builder-methods-workshop',
    title: 'The Builder Methods workshop',
    blurb: 'The method behind the site: spec it, design it, build it with agents, ship it.',
    when: 'Replay',
    kind: 'Replay',
  },
  {
    slug: 'spec-driven-development-workshop',
    title: 'Spec-driven development',
    blurb: 'The whole workflow in one sitting: plan, shape, write, task, implement, verify.',
    when: 'Replay',
    kind: 'Replay',
  },
  {
    slug: 'autonomous-agents',
    title: 'Autonomous agents',
    blurb: 'What an agent can safely do unattended, and where the human checkpoints belong.',
    when: 'Replay',
    kind: 'Replay',
  },
  {
    slug: 'ai-first-design-process',
    title: 'AI-first design process',
    blurb: 'Designing with an agent in the room: tokens, sections and screens before code.',
    when: 'Replay',
    kind: 'Replay',
  },
  {
    slug: 'claude-code-ama',
    title: 'Claude Code AMA',
    blurb: 'An open question round on Claude Code: setup, workflow, cost and control.',
    when: 'Replay',
    kind: 'Replay',
  },
  {
    slug: 'workshops/builder',
    title: 'From Vibe Coder to Builder',
    blurb:
      'The method for turning what you can prompt into real, working software: spec it, design it, build it with agents, ship it.',
    when: 'On demand',
    kind: 'On demand',
  },
  {
    slug: 'workshops/ai-native',
    title: 'From AI Dabbler to AI-Native',
    blurb:
      'The shift from using AI on the side to building with it in everything you do: more output, sharper thinking, faster execution.',
    when: 'On demand',
    kind: 'On demand',
  },
]

/* ----------------------------------------------------------------- courses */

export const COURSES: Course[] = [
  {
    id: 'claude-code-course',
    title: 'Build with Claude Code',
    blurb:
      'The workflow, the agent-directing craft and the judgment calls for working with Claude Code at a pro level.',
    lessons: 27,
    series: 'claude-code-course',
  },
  {
    id: 'build-with-ai-course',
    title: 'Become the Builder',
    blurb:
      'The on-ramp to building real apps with AI: foundations, the stack and starter template, a real product, and your first deployment.',
    lessons: 33,
    series: 'become-the-builder',
  },
  {
    id: 'ai-native-course',
    title: 'Become AI-Native',
    blurb:
      'Watch complete AI-native systems get built on real work, then adapt the patterns: deliverables, content, automated agent tasks.',
    lessons: 27,
    series: 'become-ai-native',
  },
  {
    id: 'openclaw-course',
    title: 'Multi-Agent OpenClaw',
    blurb:
      'A working OpenClaw system shared as guides: machine setup, multi-agent configuration, a custom dashboard app, skills and recurring tasks.',
    lessons: 15,
    series: 'openclaw',
  },
]

/* ---------------------------------------------------------------- articles */

export const ARTICLES: Article[] = [
  { slug: 'restarts', title: 'Restarts', date: '2026-10-02', blurb: 'When to stop, start again, and what a restart actually costs.' },
  {
    slug: 'legacy-codebases',
    title: 'Legacy codebases',
    date: '2026-01-23',
    blurb: 'Working in code nobody remembers writing, with an agent that has never seen it.',
  },
  {
    slug: 'the-final-10',
    title: 'The final 10',
    date: '2026-02-06',
    blurb: 'The last tenth of a build is where the product is actually decided.',
  },
  {
    slug: 'shape-first-then-plan',
    title: 'Shape first, then plan',
    date: '2026-04-10',
    blurb: 'Two passes before code: shape the problem, then plan the build.',
  },
  {
    slug: 'bake-your-brand-into-every-agent-skill',
    title: 'Bake your brand into every agent skill',
    date: '2026-04-15',
    blurb: 'A skill that writes in your voice has to be taught your voice, once.',
  },
  {
    slug: 'custom-platforms-are-no-longer-a-luxury',
    title: 'Custom platforms are no longer a luxury',
    date: '2026-04-17',
    blurb: 'Off-the-shelf tools fit the average business. Yours is not average.',
  },
  {
    slug: 'how-i-structure-agent-skill-folders',
    title: 'How I structure agent skill folders',
    date: '2026-04-21',
    blurb: 'The folder layout that makes a skill one file plus what it needs.',
  },
  {
    slug: '-when-i-dont-build-my-own-tool-i-talk-a-lot-about-building-purpose-built-tools-sparkdrop-for',
    title: 'When I don’t build my own tool',
    date: '2026-10-02',
    blurb: 'Purpose-built tools, and the builds that get talked about instead of shipped.',
  },
  {
    slug: 'night-shift-agent-loop',
    title: 'The night shift agent loop',
    date: '2026-05-15',
    blurb: 'What an agent gets done overnight, and how to review it in the morning.',
  },
  {
    slug: 'ai-native-doesnt-mean-replacing-yourself-or-your-team',
    title: 'AI-native doesn’t mean replacing yourself or your team',
    date: '2026-06-05',
    blurb: 'AI-native doesn’t mean automating yourself out of your business. It means moving your time upstream.',
  },
  {
    slug: 'stop-asking-can-ai-build-this-ask-can-i-specify-this',
    title: 'Stop asking “can AI build this?” Ask “can I specify this?”',
    date: '2026-06-09',
    blurb: 'AI knocked down the syntax barrier. The skill that matters now is specification.',
  },
  {
    slug: 'how-to-make-your-job-irreplaceable-by-ai',
    title: 'How to make your job irreplaceable by AI',
    date: '2026-06-23',
    blurb: 'The “AI is coming for your job” panic has the direction exactly backwards.',
  },
  {
    slug: 'i-hand-write-0-of-my-code-i-miss-it',
    title: 'I hand-write 0% of my code. I miss it.',
    date: '2026-06-26',
    blurb: 'Twenty years of writing code, and what changes when you stop.',
  },
  {
    slug: 'the-case-for-rebuilding-early-often',
    title: 'The case for rebuilding early & often',
    date: '2026-06-30',
    blurb: 'A rebuild used to be the last resort. With agents it can be the first.',
  },
  {
    slug: 'make-claude-prove-its-work-with-2-critical-verifications',
    title: 'Make Claude prove its work with 2 critical verifications',
    date: '2026-07-03',
    blurb: '“It works,” Claude told me. It hadn’t run anything.',
  },
  {
    slug: 'domain-experts-now-is-your-moment',
    title: 'Domain experts: now is your moment',
    date: '2026-07-07',
    blurb: 'If you’ve ever decided not to build something because you can’t code, I want to change your mind.',
  },
  {
    slug: 'stop-one-shotting-your-app',
    title: 'Stop one-shotting your app',
    date: '2026-07-10',
    blurb: 'A frontier model can build your whole app in one prompt. Sometimes that’s even true.',
  },
  {
    slug: 'why-i-plan-every-build-twice',
    title: 'Why I plan every build twice',
    date: '2026-07-14',
    blurb: 'Two separate layers of planning before the real coding starts.',
  },
  {
    slug: 'mcp-api-and-browser-use-explained',
    title: 'MCP, API, and browser use explained',
    date: '2026-07-24',
    blurb: 'The bigger shift is that agents can now operate your tools, not just describe them.',
  },
  {
    slug: 'how-to-trust-code-that-ai-wrote',
    title: 'How to trust code that AI wrote',
    date: '2026-07-28',
    blurb: 'The code comes out faster than you can review it. So the review has to change.',
  },
  {
    slug: 'ai-prompts-us',
    title: 'AI prompts, US',
    date: '2025-12-27',
    blurb: 'A prompt library, and what a prompt is actually for.',
  },
]

/* ------------------------------------------------------------------- totals */

export const COUNTS = {
  tools: 8,
  commands: 20,
  kits: KITS.length,
  series: SERIES.length,
  videos: 133,
  catalogued: VIDEOS.length,
  sessions: SESSIONS.length,
  courses: COURSES.length,
  articles: ARTICLES.length,
}

export function url(path: string): string {
  return `${SOURCE}/${path.replace(/^\//, '')}`
}
