---
name: fusion-planner
description: Explores the codebase, analyzes architectural structure, identifies features, and breaks down complex requirements into structured missions and task dependency chains for the Fusion execution engine. Use when the user asks to plan, explore the repository, or break down work.
---

# Fusion Planner & Codebase Explorer Skill

When the user asks you to explore the repository, analyze a complex request, or plan tasks/missions using Fusion, follow this structured skill.

## 1. Codebase Exploration Strategy

Before generating any tasks or planning a mission, you must understand the current codebase. Perform a systematic, read-only investigation:

1. **Map the Architecture:** Review the workspace layout (e.g., Apps vs. Libs in an Nx monorepo).
2. **Find Gaps/TODOs:** Search for missing integrations, empty files, placeholder comments, or `TODO` annotations in key directories:
   - UI/Components: `libs/ui/` or client directories.
   - APIs & Routers: `apps/web/src/app/` or `src/server/`.
   - Service layers and type definitions.
3. **Verify Database Schema:** Look at migrations (e.g., `supabase/migrations/`) to identify structural constraints.

## 2. Decision Tree: Task vs. Mission

Choose the correct execution model based on the complexity:

```
1. Is it a single, self-contained change (e.g., fix a typo, add a simple file)?
   ├── Yes ──> Create a single task (XS to S)
   └── No  ──> Go to Step 2

2. Does it require multiple distinct files, layers, or logical steps (e.g., new endpoint + DB table + UI)?
   ├── Yes ──> Decompose into a Task Dependency Chain (M to L)
   └── No  ──> Go to Step 3

3. Is it a large subsystem or complex feature requiring phase-based delivery?
   └── Yes ──> Design a structured Mission (Milestones ──> Slices ──> Features ──> Tasks)
```

## 3. Planning & Proposal Flow (Mandatory)

Always present your plan to the user **before** running task creation commands. 

### A. Task Dependency Chain Proposal
Format your proposal clearly so the user can review the scope:
```markdown
### Proposed Task Plan: [Initiative Name]
- **Task 1: Database Migration** (Size: S) - Setup schema `X`.
- **Task 2: API Endpoints** (Size: M) - Implement routes (Depends on Task 1).
- **Task 3: Client Components** (Size: M) - Build the interface (Depends on Task 2).
```

### B. Mission Hierarchy Proposal
For large features, outline the Milestones, Slices, and Features:
```markdown
### Proposed Mission: [Mission Title]
- **Milestone 1: Backend Scaffolding**
  - *Slice A: Core API Setup*
    - Feature: Database migrations and model mapping.
    - Feature: Auth middleware verification.
- **Milestone 2: UI Implementation**
  - *Slice B: Dashboard View*
    - Feature: Interactive controls and telemetry stream.
```

## 4. Orchestration CLI Reference

After the user approves your proposal, execute the setup using the local `fn` CLI prefix (`npx runfusion.ai`):

### Creating Tasks with Dependencies
```bash
# Create base task and capture ID (e.g., FN-001)
npx runfusion.ai task create "Database migration for session tracking. File: supabase/migrations/. Acceptance: table exists."

# Create dependent tasks
npx runfusion.ai task create "API routes for sessions. File: apps/web/src/app/api/sessions/route.ts. Acceptance: returns 200." --depends FN-001
```

### Creating & Managing Missions
```bash
# Create the mission
npx runfusion.ai mission create "[Title]" "[Description]"

# List missions
npx runfusion.ai mission list

# Show mission state (for milestone/slice IDs)
npx runfusion.ai mission show <mission-id>

# Activate the initial slice to start execution
npx runfusion.ai mission activate-slice <slice-id>
```
*Note: Ensure `autopilotEnabled` is toggled true in settings (or via the dashboard) to automatically plan features to tasks.*

## 5. Troubleshooting Local LLM Execution

When orchestrating tasks via a local LLM daemon (e.g., Qwen running locally on the remote node):
- **Avoid Research Synthesis:** Local models often timeout during complex synthesis rounds. Perform manual code searches (`grep_search`, `list_dir`) and document the findings yourself.
- **Provide Direct Steer Guidance:** If executors stall or fail, read their thinking logs at `.fusion/agents/` and run `npx runfusion.ai task steer <task-id> "[guidance]"` to unblock them.
