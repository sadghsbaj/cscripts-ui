---
trigger: glob
globs: "**/.agents/rules/*.md"
---

# Rule: Rule Authoring & Structure

<meta>
  <scope>All workspace rules under `.agents/rules/`</scope>
  <applies_to>**/.agents/rules/*.md</applies_to>
  <version>1.1</version>
</meta>

<principles>
  - Write in concise, declarative English. Rules are specifications, not conversational prompts.
  - Keep each file focused on a single concern and well under Antigravity's 24 KB per-file rule cap.
  - Prefer tables and bullet points over prose paragraphs so agents can scan and verify deterministically.
  - Use a hybrid Markdown + XML structure: YAML frontmatter for Antigravity discovery, Markdown heading for readability, XML tags for machine-parseable sections.
</principles>

<patterns>
  <frontmatter>
    - Every file under `.agents/rules/` MUST start with a YAML frontmatter block (`---`) containing a valid `snake_case` `trigger`:
      - `trigger: always_on` — always loaded into context.
      - `trigger: glob` — requires `globs: "**/path/**, **/other/**"` as a single comma-separated string (NO YAML arrays, NO `{a,b}` brace expansion; workspace-relative paths MUST start with `**/` because matching runs against absolute paths).
      - `trigger: model_decision` — requires `description: "..."` for on-demand loading.
      - `trigger: manual` — only loaded when explicitly invoked.
  </frontmatter>

  <required_sections>
    - `# Rule: <Title>` — Clear title matching the filename.
    - `<meta>` — `<scope>`, `<applies_to>`, `<version>`.
    - `<principles>` — 2 to 5 high-level design or engineering truths.
    - `<constraints>` — Hard `MUST` / `MUST NOT` invariants.
  </required_sections>

  <optional_sections>
    - `<patterns>` — Concrete naming, file, or API schemas.
    - `<dictionary>` — Canonical terms vs. forbidden aliases (when terminology consistency matters).
    - `<checklist>` — Step-by-step verification items (ideal for reviewer sub-agents).
    - `<exceptions>` — Documented, intentional deviations and why they exist.
  </optional_sections>
</patterns>

<constraints>
  - MUST include valid YAML frontmatter with `trigger` in `snake_case` (`always_on`, `glob`, `model_decision`, or `manual`); otherwise Antigravity silently ignores the rule.
  - MUST format `globs` as a single comma-separated string prefixed with `**/` (no YAML lists or brace expansion).
  - MUST NOT exceed 24 KB per rule file.
  - MUST NOT include long tutorials or code examples; link to source files or `*.docs.md` instead.
  - MUST NOT duplicate rules already enforced deterministically by ESLint unless needed as architectural context.
  - MUST keep XML section names lowercase `snake_case` (`<meta>`, `<principles>`, `<patterns>`, `<dictionary>`, `<checklist>`, `<exceptions>`, `<constraints>`).
</constraints>
