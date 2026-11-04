/** Role-specific process steps and their associated Agent OS instructions. */
export type Role = 'business' | 'design' | 'development' | 'quality' | 'delivery'
export interface ProcessStep { id: string; label: string; purpose: string; question: string; suggestion: string; commands: string[] }
const step = (id: string, label: string, purpose: string, question: string, suggestion: string, commands: string[]): ProcessStep => ({ id, label, purpose, question, suggestion, commands })
export const workflows: Record<Role, ProcessStep[]> = {
  business: [
    step('vision','Vision & outcomes','Define the problem, value proposition, outcomes and success measures.','Whose problem are we solving, and how will we know it worked?','Start with one primary audience and a measurable outcome.',['product-vision','plan-product']),
    step('discovery','Discovery & stakeholders','Map stakeholders, constraints, customer and business needs.','Who needs to be involved or consulted, and what constraints matter?','List key stakeholders and note any unknowns.',['shape-spec']),
    step('users','Users & journeys','Describe personas, needs, journeys and pain points.','Which users and journeys should we prioritize first?','Start with your main user and their most important journey.',['product-vision','shape-section']),
    step('requirements','Requirements & scope','Write the PRD, features, exclusions, acceptance criteria and risks.','What must the first release include, and what should it exclude?','Focus on the smallest useful first release.',['shape-spec','write-spec']),
    step('data','Business data & rules','Define conceptual and logical entities, fields, relationships, data rules, ownership and external information exchanges.','What information does the business need to remember, how does it relate, and what rules apply?','Start with a conceptual or logical data model and glossary; technical schema comes later.',['data-shape']),
    step('roadmap','Roadmap & milestones','Prioritize dependency-ordered milestones with outcomes and acceptance checks.','What constraints, priorities or deadlines shape the release order?','Deliver a small end-to-end milestone before expanding.',['product-roadmap','create-tasks']),
    step('handoff','Review & handoff','Prepare decisions, unresolved questions, prompts and a handoff to the team.','What decisions or uncertainties must the team confirm before design starts?','Call out assumptions explicitly for review.',['write-spec','export-product']),
  ],
  design: [
    step('research','Research & CX','Plan research, customer experience, evidence and service touchpoints.','What research or customer evidence is available, and what is unknown?','Separate known evidence from assumptions.',['shape-spec']),
    step('personas','Personas & needs','Synthesize user needs, accessibility needs and scenarios.','Which user groups and accessibility needs must be supported?','Prioritize the primary user without excluding others.',['product-vision']),
    step('journeys','Journeys & flows','Map end-to-end customer journeys, task flows and edge states.','Which journey should be designed first, including its edge cases?','Begin with the core task and its error and empty states.',['shape-section']),
    step('architecture','Information architecture','Organize navigation, content, labels and information hierarchy.','What content and navigation should people find most easily?','Keep navigation task-oriented and understandable.',['shape-section','design-shell']),
    step('system','Design system & tokens','Define reusable tokens, components, accessibility and responsive rules.','Are there existing brand guidelines, tokens or components to reuse?','Use a consistent accessible system and document the source.',['design-tokens','design-shell']),
    step('screens','Wireframes & screens','Specify screen layouts, responsive states, components and realistic sample data.','Which screens and states are highest priority?','Start with the primary flow at mobile and desktop sizes.',['sample-data','design-screen']),
    step('validation','Prototype & validation','Plan usability validation, feedback, iteration and measures.','How should designs be validated and who will participate?','Use a small usability review and record findings.',['screenshot-design']),
    step('handoff','Design handoff','Document interactions, components, assets and implementation guidance.','What must developers know before implementing the design?','Include behavior, accessibility, tokens and open decisions.',['export-product']),
  ],
  development: [
    step('standards','Standards & references','Record existing code references and patterns provided by the user; ask why.','What existing patterns, files, stack or standards should be followed, and why?','If none are available, record assumptions rather than claiming discovery.',['discover-standards','index-standards','inject-standards']),
    step('architecture','Architecture & stack','Plan components, integration boundaries, security and technology choices.','What stack and constraints should the implementation follow?','Choose a simple stack only after confirming constraints.',['plan-product','shape-spec']),
    step('specification','Shape specification','Produce feature shape, references, standards and implementation plan.','What should this feature do, and are there similar implementations?','Provide relevant files or examples; unknowns remain open.',['shape-spec','write-spec']),
    step('database','Database & migrations','Design physical schemas, storage, data migration and operational safeguards using the business data model.','What storage technology, existing schema or migration constraints should developers consider?','Use the business data model as input and verify technical decisions with the team.',['data-shape','shape-spec']),
    step('tasks','Tasks & dependencies','Break implementation into small dependency-ordered tasks.','What is the smallest deliverable and which dependencies come first?','Include verification and a documentation task.',['create-tasks','orchestrate-tasks']),
    step('implementation','Implementation starter','Draft implementation files based on the approved context.','Which part should be built first and what constraints apply?','Start with one vertical slice and review the generated code.',['implement-tasks']),
    step('verification','Verification & regression','Plan unit, integration, accessibility and regression checks.','What behavior and regressions are most important to verify?','Record tests to run; do not claim tests already passed.',['implement-tasks']),
    step('handoff','Deployment & handoff','Document setup, deployment, operations, known risks and next steps.','Where will the product run, and what deployment constraints apply?','Document unverified setup and release steps.',['export-product','improve-skills']),
  ],
  quality: [
    step('strategy','Quality strategy','Define risks, test levels, quality goals and environments.','What are the highest-risk failures and quality expectations?','Prioritize critical user journeys and security risks.',['shape-spec']),
    step('cases','Acceptance & test cases','Write traceable test cases for requirements and edge states.','Which acceptance criteria and edge cases should be covered first?','Cover the happy path, errors, accessibility and permissions.',['write-spec']),
    step('regression','Regression & accessibility','Plan regression, responsive, accessibility and cross-browser checks.','What devices, browsers, assistive technologies or regressions matter?','Record the supported matrix and critical checks.',['create-tasks']),
    step('execution','Execution plan','Prepare test data, execution and defect reporting guidance.','What test environments, data and constraints are available?','Use safe sample data and label tests as not run.',['implement-tasks']),
    step('release','Release readiness','Define evidence, sign-off and unresolved risk for release.','Who signs off and what evidence is required for release?','Make release blockers and owners explicit.',['export-product']),
  ],
  delivery: [
    step('planning','Delivery planning','Plan scope, dependencies, ownership and delivery milestones.','What timeline, budget or team constraints should guide delivery?','Identify dependencies and owners before committing to dates.',['plan-product','product-roadmap']),
    step('risks','Risks & dependencies','Track risks, assumptions, issues, dependencies and mitigations.','What could prevent delivery, and who can resolve it?','Record the highest impact unknowns first.',['shape-spec']),
    step('release','Release & adoption','Plan rollout, communications, training and rollback.','How will the change be released and adopted?','Use a staged release with a rollback plan.',['create-tasks']),
    step('operations','Operations & support','Plan monitoring, ownership, support and incident response.','Who will operate and support the product after release?','Assign a clear support owner and escalation path.',['write-spec']),
    step('measure','Measure & improve','Plan outcomes tracking, feedback and continuous improvement.','What signals will show whether the product is successful?','Pick a small number of measurable outcomes.',['improve-skills','export-product']),
  ],
}
export function getStep(role: Role, id: string) { return workflows[role]?.find(item => item.id === id) }
export function specPrefix(role: Role, id: string) { return `specs/${role}/${id}/` }
