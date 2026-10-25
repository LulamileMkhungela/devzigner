# Standards

Standards is the second layer of ProdOps: conventions that live in the target
codebase so an agent builds the way the product builds. It is not a flow — it
records the rules the code has to keep, and makes them available to every later
task.

| Command | Writes |
| --- | --- |
| `/discover-standards` | `standards/standards/<folder>/*.md` — one standard per convention, read from the code |
| `/index-standards` | `standards/standards/index.yml` — the index an agent scans first |
| `/inject-standards` | the matching standards into the task in front of you |
| `/plan-product` | `standards/product/mission.md`, `roadmap.md`, `tech-stack.md` |
| `/shape-spec` | `standards/specs/<feature>/` — the spec a milestone is built against |

Run them from the project this folder was copied into; they write to the
project, never back into the folder they came from.
