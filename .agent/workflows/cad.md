---
description: Logic for managing CAD projects and deciding when to fork the generator.
---

# /cad Workflow

Invoking `/cad` (or when the agent detects a CAD request) triggers this logic.

## 1. Decision Tree

```
1. Is this a dimension-only change to the standard bracket?
   → YES: Run `python -m cad_engine.generator --width X --height Y`
   → NO: Continue to step 2

2. Does a project already exist for this design?
   → YES: Modify `projects/<name>/design.py`, then run it
   → NO: Continue to step 3

3. Fork the generator:
   mkdir -p projects/<name>
   touch projects/<name>/__init__.py
   cp cad_engine/generator.py projects/<name>/design.py

4. Implement the design in design.py

5. Run and validate:
   python -m projects.<name>.design --output projects/<name>/model.stl
```

## 2. Request Types

### Type A: Parametric Adjustment (Simple)
*User wants to change dimensions of the standard bracket (width, height, hole size, etc).*
- **Action**: Do NOT modify code. Run the `cad_engine/generator.py` script with arguments.
- **Example**: "Make it 60mm wide."
- **Command**: `python -m cad_engine.generator --width 60`

### Type B: New Design / Complex Modification (Fork)
*User wants a different shape, specific features (chamfers, slots), or a totally new part.*
- **Action**: Create a new project in `projects/` and fork the base generator.

## 3. Project Structure

```text
retrograde-nebula/
├── projects/
│   └── phone_stand/        <-- The Project Root
│       ├── __init__.py     <-- Makes it importable
│       ├── design.py       <-- The Source of Truth (Code)
│       └── model.stl       <-- The Output Artifact (Generated here)
```

## 4. Printer Constraints

- **Bed Size**: 256mm x 256mm x 256mm
- **Minimum Wall Thickness**: 1.2mm (for structural integrity)
- **Minimum Hole Diameter**: 2mm (for printability)

If a design exceeds bed size, consider:
1. Splitting the model (use `split()`)
2. Adding joinery (mortise/tenon, lap joints)

---

## build123d Cheat Sheet

### Primitives
```python
Box(length, width, height)                    # Rectangular solid
Box(10, 20, 5, align=(Align.MIN, Align.MIN, Align.MIN))  # Anchor at origin
Cylinder(radius, height)                       # Cylinder
Sphere(radius)                                 # Sphere
Cone(bottom_radius, top_radius, height)        # Cone/frustum
```

### Boolean Operations
```python
add(obj)                    # Union (combine objects)
mode=Mode.SUBTRACT          # Cut away from parent
mode=Mode.INTERSECT         # Keep only intersection

# Example: Cut a hole
with BuildPart() as model:
    Box(100, 100, 10)
    with Locations((50, 50, 0)):
        Cylinder(radius=5, height=20, mode=Mode.SUBTRACT)
```

### Transformations & Positioning
```python
Locations((x, y, z))                  # Position context
Locations([(x1,y1,z1), (x2,y2,z2)])   # Multiple positions
Rotation(x_deg, y_deg, z_deg)         # Rotation context
mirror(about=Plane.XZ)                # Mirror geometry
split(bisect_by=Plane.XY, keep=Keep.TOP)  # Cut in half
```

### Edge Operations
```python
fillet(edges, radius=2)               # Round edges
chamfer(edges, length=2)              # Bevel edges

# Edge Selection
model.edges()                         # All edges
model.edges().filter_by(Axis.Z)       # Edges parallel to Z
model.edges().sort_by(Axis.Z)[-1]     # Topmost edge
model.edges().filter_by(lambda e: e.center().X > 10)  # Custom filter
```

### Face Selection
```python
model.faces()                         # All faces
model.faces().sort_by(Axis.Z)[-1]     # Top face
model.faces().filter_by(Axis.X)       # Faces perpendicular to X
```

### Holes
```python
Hole(radius, depth)                             # Simple hole
CounterBoreHole(radius, depth, cbore_r, cbore_d)  # Counterbore
CounterSinkHole(radius, depth, csink_r, csink_a)  # Countersink

# Hole Patterns
with GridLocations(x_spacing=10, y_spacing=10, x_count=3, y_count=3):
    Hole(radius=2, depth=10)
```

### Sketches & Extrusion
```python
with BuildPart() as model:
    with BuildSketch() as sketch:
        Rectangle(width, height)
        Circle(radius)
    extrude(amount=10)               # Extrude sketch into 3D
```

### Shell (Hollow Out)
```python
with BuildPart() as box:
    Box(100, 100, 50)
    top_face = box.faces().sort_by(Axis.Z)[-1]
    offset(amount=-3, openings=[top_face])  # 3mm walls, open top
```

### Export
```python
export_stl(part, "path/to/file.stl")
export_step(part, "path/to/file.step")
```

---

## Common Patterns

### Pattern: Hollow Box (Shell)
```python
with BuildPart() as box:
    Box(100, 100, 50)
    top_face = box.faces().sort_by(Axis.Z)[-1]
    offset(amount=-3, openings=[top_face])  # 3mm walls, open top
```

### Pattern: Grid of Holes
```python
with GridLocations(x_spacing=10, y_spacing=10, x_count=5, y_count=5):
    Hole(radius=2, depth=10)
```

### Pattern: L-Bracket
```python
with BuildPart() as bracket:
    with BuildSketch() as sketch:
        Rectangle(width, thickness, align=(Align.MIN, Align.MIN))
        Rectangle(thickness, height, align=(Align.MIN, Align.MIN))
    extrude(amount=depth)
```

### Pattern: Mounting Tabs
```python
tab_positions = [(-40, 0, 0), (40, 0, 0)]
with BuildPart() as tabs:
    with Locations(tab_positions):
        Box(20, 10, 3)
        Hole(radius=2.5, depth=5)  # M5 clearance
```

### Pattern: Edge Filtering for Fillets
```python
# Filter vertical edges at corners
def is_corner_edge(edge):
    cx, cy = edge.center().X, edge.center().Y
    return abs(abs(cx) - width/2) < 0.5 and abs(abs(cy) - length/2) < 0.5

corner_edges = model.edges().filter_by(Axis.Z).filter_by(is_corner_edge)
if corner_edges:
    fillet(corner_edges, radius=3)
```

### Pattern: Two-Part Assembly (Split + Joinery)
```python
# 1. Split the model
with BuildPart() as left:
    add(full_model.part)
    split(bisect_by=Plane.YZ, keep=Keep.BOTTOM)

with BuildPart() as right:
    add(full_model.part)
    split(bisect_by=Plane.YZ, keep=Keep.TOP)

# 2. Add alignment tenons to one half
with BuildPart() as right_with_tenon:
    add(right.part)
    with Locations((0, 0, 5)):
        Box(8, 10, 3)  # Tenon

# 3. Cut mortises in the other half
with BuildPart() as left_with_mortise:
    add(left.part)
    with Locations((0, 0, 5)):
        Box(8.4, 10.4, 3.2, mode=Mode.SUBTRACT)  # Mortise with clearance
```

---

## ⚠️ Common Pitfalls

### P1: Forgetting Alignment
**Wrong**: `Box(10, 10, 10)` — Centers at origin  
**Right**: `Box(10, 10, 10, align=(Align.MIN, Align.MIN, Align.MIN))` — Starts at origin

### P2: Hole Depth Too Shallow
**Wrong**: `Hole(radius=2, depth=5)` — May not cut through thin walls  
**Right**: `Hole(radius=2, depth=wall_thickness * 2)` — Overshoot to ensure clean cut

### P3: Fillet Failures
Fillets fail if radius > edge length. Always wrap in try/except:
```python
try:
    fillet(edges, radius=2)
except Exception as e:
    print(f"Fillet failed: {e}")
```

### P4: Edge Selection Returns Empty
Always check before applying operations:
```python
edges = model.edges().filter_by(Axis.Z)
if edges:
    chamfer(edges, length=2)
```

### P5: Rotation Direction
Rotations follow right-hand rule. To drill along an axis:
- Drill along **Y**: `Rotation(90, 0, 0)`
- Drill along **X**: `Rotation(0, 90, 0)`
- Drill along **Z**: No rotation needed (default)

### P6: Clearance for Fits
Always add clearance for mating parts:
- **Loose fit**: +0.3mm per side
- **Press fit**: -0.1mm per side
- **Sliding fit**: +0.15mm per side

---

## Execution & State

- **Context**: Once a project is created or referenced, treat it as the **Active Project**.
- **Command**: Run the design script as a module from the repository root.
  ```bash
  python -m projects.phone_stand.design --output projects/phone_stand/model.stl
  ```
- **Updates**: When the user requests changes (e.g., "make the hole bigger"):
  1. Edit `projects/phone_stand/design.py`.
  2. Rerun the command to regenerate `projects/phone_stand/model.stl`.

## Version Control

- **No Git Commands**: Do NOT run `git add`, `git commit`, or `git push` when working on CAD projects.
- The user manages version control manually.
