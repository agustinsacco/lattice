# CAD Engine Patterns

This directory contains reusable pattern examples for common CAD operations using build123d.

## Available Patterns

- `hollow_box.py` - Creating shells/enclosures with walls
- `mounting.py` - Mounting holes, tabs, and standoffs
- `joinery.py` - Split parts with mortise/tenon and lap joints
- `ventilation.py` - Vent slots and honeycomb patterns

## Usage

Import patterns into your design:

```python
from cad_engine.patterns.mounting import create_mounting_tab
from cad_engine.patterns.hollow_box import create_shell
```
