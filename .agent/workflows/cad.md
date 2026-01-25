---
description: Logic for managing CAD projects and deciding when to fork the generator.
---

# /cad Workflow

Invoking `/cad` (or when the agent detects a CAD request) triggers this logic.

## 1. Analyze the Request
Determine the complexity of the request:

### Type A: Parametric Adjustment (Simple)
*User wants to change dimensions of the standard bracket (width, height, hole size, etc).*
- **Action**: Do NOT modify code. Run the `cad_engine/generator.py` script with arguments.
- **Example**: "Make it 60mm wide."
- **Command**: `python -m cad_engine.generator --width 60`

### Type B: New Design / Complex Modification (Fork)
*User wants a different shape, specific features (chamfers, slots), or a totally new part.*
- **Action**: Create a new project in `projects/` and fork the base generator.
- **Protocol**:
    1. **Choose a Name**: E.g., `projects/custom_mount`.
    2. **Scaffold**: Create the directory.
    3. **Copy**: Copy `cad_engine/generator.py` to `projects/<name>/design.py`.
    4. **Refactor**: Modify `projects/<name>/design.py` to implement the new geometry.
    5. **Run**: Execute from root: `python -m projects.<name>.design`

## 2. Architecture: Pure Code (The "Design As Code" Philosophy)
We do **not** use static config files (JSON/YAML) for geometry because they limit complexity.
Instead, **every project is an executable Python script**.
- **Scaffolding**: To start a project, we clone the base `generator.py` into the project folder as `design.py`.
- **Flexibility**: The `design.py` script *is* the definition. To change the design, we edit this script.

## 3. Project Structure
When creating a project (e.g., `phone_stand`), the structure **MUST** be:
```text
retrograde-nebula/
├── projects/
│   └── phone_stand/        <-- The Project Root
│       ├── __init__.py     <-- Makes it importable
│       ├── design.py       <-- The Source of Truth (Code)
│       └── model.stl       <-- The Output Artifact (Generated here)
```

## 4. Execution & State
- **Context**: Once a project is created or referenced, treat it as the **Active Project**.
- **Command**: Run the design script as a module from the repository root.
  ```bash
  python -m projects.phone_stand.design --output projects/phone_stand/model.stl
  ```
- **Updates**: When the user requests changes (e.g., "make the hole bigger"):
  1. Edit `projects/phone_stand/design.py`.
  2. Rerun the command to regenerate `projects/phone_stand/model.stl`.

## 4. Priming & Context
- The agent reads this file automatically when relevant keywords (CAD, scaffold, project, model) are detected.
- This ensures consistency across different chat sessions.

## 5. Version Control
- **No Git Commands**: Do NOT run `git add`, `git commit`, or `git push` when working on CAD projects.
- The user manages version control manually.
