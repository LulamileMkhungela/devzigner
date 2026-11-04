/** Editable example templates are never a substitute for confirmed project requirements. */
import type { FileItem, Role } from './model'

// Examples are clearly marked and only become project context if the user chooses to use them.
export const briefTemplate = `EXAMPLE — replace this text with your project information.\n\nWhat do you want to build?\nA dashboard that helps a small team see its work.\n\nWhat problem are you solving?\nUpdates are scattered and it is hard to see what needs attention.\n\nWho is it for?\nA delivery lead and the people doing the work.\n\nWhat should the first version do?\nShow work and its status, and make priorities easy to understand.\n\nWhat is out of scope or unknown?\nConfirm integrations, security and measures with the team.`
export const roleTemplates: Record<Exclude<Role,'business'>,string> = {
  design:'EXAMPLE — replace with your design context.\n\nAudience and accessibility needs: Team members using desktop and mobile.\nExisting design system: None confirmed.\nKey screens and constraints: A clear overview, list and empty state.\nOpen questions: Validate the information hierarchy with users.',
  development:'EXAMPLE — replace with your development context.\n\nExisting stack and components: Confirm with the team.\nImplementation constraints: Reuse available components and follow the agreed requirements.\nIntegrations and data: To be confirmed.\nOpen questions: Confirm hosting, authentication and deployment.',
  quality:'EXAMPLE — replace with your quality context.\n\nCritical journeys: Review and update work.\nDevices and browsers: Confirm the supported matrix.\nRisks and test data: Use fictional records; identify high-impact failures.\nOpen questions: Confirm release criteria and test environments.',
  delivery:'EXAMPLE — replace with your delivery context.\n\nOwners and timeline: To be confirmed.\nRelease and support: Plan a staged rollout and a support owner.\nRisks and dependencies: Confirm privacy, operations and rollback.\nMeasures: Agree a baseline and outcome targets.',
}
export function starterRequirements(): FileItem[] {
  return [
    {path:'specs/business/requirements/business-requirements.md',content:'# Business requirements\n\n> Example template — replace these examples before approval.\n\n## Business problem\nExample: The team cannot easily see current work.\n\n## Desired outcome\nExample: Reduce the time spent collecting status updates.\n\n## Stakeholders and scope\nExample: Delivery leads and team members; confirm exclusions.\n'},
    {path:'specs/business/requirements/functional-requirements.md',content:'# Functional requirements\n\n> Example template — replace these examples before approval.\n\n1. Example: Show the current list of work.\n2. Example: Filter work by priority.\n3. Example: Update a work item status.\n\n## Acceptance criteria\nExample: A user can see an updated status after making a change. Confirm persistence and permissions.\n'},
    {path:'specs/design/screens/design-requirements.md',content:'# Design requirements\n\n> Example template — replace using the business and functional requirements.\n\n- Example: Make primary information easy to scan.\n- Example: Provide desktop, mobile, empty and error states.\n- Example: Use named tokens and visible keyboard focus.\n\n## Open questions\nConfirm existing components, accessibility needs and available research.\n'},
  ]
}
