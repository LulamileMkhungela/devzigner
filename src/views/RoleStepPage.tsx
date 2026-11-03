// ProdOps — developed by Lulamile Mkhungela.
//
// A role step page in the IDE shape: the step's work in the centre, the
// inspector (review actions, what's next, the skill) on the right. The left
// panel holds the process itself. Simple three panes, no canvas to learn.

import type { ReactNode } from 'react'
import type { RoleDef, RoleStep } from '../lib/roles'
import { RoleInspector } from '../components/role'

export function RoleStepPage({ role, step, children }: { role: RoleDef; step: RoleStep; children: ReactNode }) {
  return (
    <div className="lz-ide">
      <div className="lz-ide-work">{children}</div>
      <RoleInspector role={role} step={step} />
    </div>
  )
}
