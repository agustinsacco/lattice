# Retrograde Nebula

Retrograde Nebula is a Python-based parametric CAD framework designed for "Design-as-Code" workflows. Built on top of [build123d](https://github.com/gumyr/build123d), it facilitates the creation of parametric 3D models and manages multiple design projects purely through code.

## Core Philosophy

*   **Parametric First:** All designs are driven by parameters (dimensions, angles, etc.), allowing for rapid iteration and adjustment.
*   **Python as DSL:** No static config files for geometry. The design definition *is* the executable Python script.
*   **Repo-driven Methodology:** Designs are organized as "projects" within the repository, making them easy to version control and share.

## Agentic Coding (AI-Assisted Workflow)

This project is optimized for AI-assisted development. When working with an AI coding assistant:

### Getting Started

**Always invoke `/cad` at the start of a CAD-related conversation.** This primes the agent with project context and ensures consistent behavior across sessions.

### How It Works

The agent automatically determines the appropriate action based on your request:

| Request Type | Agent Action | Example |
|--------------|--------------|---------|
| **Parametric Adjustment** | Runs existing generator with new args | "Make it 80mm wide" |
| **New Design / Complex Modification** | Creates a new project fork | "I need a phone stand with angled slots" |

### Example Prompts

**Simple parametric changes (no code changes):**
```
@/cad I need a bracket that's 100mm wide and 50mm tall
```
```
@/cad Generate a thicker version - 8mm thickness
```

**Custom designs (creates a new project):**
```
@/cad I need a wall-mounted tablet holder with cable routing channels
```
```
@/cad Create a keyboard tray with adjustable tilt mechanism
```

**Modifying existing projects:**
```
@/cad Update the computer_case project - make the standoffs 5mm taller
```
```
@/cad Add ventilation holes to the left panel in the computer_case project
```

### For Existing Projects

When resuming work on an existing project in a new conversation, still invoke `/cad` - this ensures the agent:
- Understands the project structure
- Knows where output files should go
- Makes the right decision about modifying vs. forking

## Installation

1.  **Environment Setup**:
    Ensure you have Python installed (checked with `.python-version`). It is recommended to use a virtual environment.

2.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

## Usage

### 1. The Standard Generator (Parametric Brackets)
For simple, standard parts like V-slot brackets, you can run the core generator directly without creating a new project.

**Example: Generate a 60mm wide bracket**
```bash
python -m cad_engine.generator --width 60 --height 40 --thickness 5 --output outputs/bracket_60mm.stl
```

### 2. Creating a Custom Project
For unique parts or complex modifications, the recommended workflow is to scaffold a new project. This copies the base generator logic into a dedicated space where you can heavily modify the geometry without affecting the core engine.

**Steps:**

1.  **Create a Project Directory**:
    ```bash
    mkdir -p projects/my_custom_part
    touch projects/my_custom_part/__init__.py
    ```

2.  **Bootstrap the Design**:
    Copy the base generator to your project as a starting point.
    ```bash
    cp cad_engine/generator.py projects/my_custom_part/design.py
    ```

3.  **Edit the Design**:
    Open `projects/my_custom_part/design.py` and modify the `generate_bracket` function (or rename it) to build your transform the geometry using `build123d` commands.

4.  **Build the Model**:
    Run your project's module to generate the STL.
    ```bash
    python -m projects.my_custom_part.design
    ```
    By default, this saves the output to `projects/my_custom_part/model.stl` (if you updated the default in your design file) or the path specified via arguments.

## Project Structure

```text
retrograde-nebula/
├── cad_engine/             # Core logic and utilities
│   ├── generator.py        # The base parametric generator script
│   └── utils.py            # Helper functions (e.g., mesh analysis)
├── projects/               # User-created designs
│   └── table_hook/         # Example Project
│       ├── __init__.py
│       ├── design.py       # Modified design script for this specific part
│       └── model.stl       # Generated 3D model
└── requirements.txt        # Python dependencies
```

## Technologies

*   **Language**: Python
*   **CAD Kernel**: [build123d](https://build123d.readthedocs.io/en/latest/) (Open CASCADE technology)
