"""
Mounting Pattern - Holes, tabs, standoffs for assembly.
"""
from build123d import *


def create_mounting_hole(diameter=5.5, depth=10, counterbore=False, cbore_diameter=10, cbore_depth=3):
    """
    Creates a mounting hole (optionally with counterbore for bolt heads).
    
    Args:
        diameter: Hole diameter (use 5.5 for M5 clearance)
        depth: Hole depth
        counterbore: If True, adds counterbore
        cbore_diameter: Counterbore diameter
        cbore_depth: Counterbore depth
        
    Common sizes:
        M3: diameter=3.4, cbore_diameter=6.5
        M4: diameter=4.5, cbore_diameter=8
        M5: diameter=5.5, cbore_diameter=10
        M6: diameter=6.6, cbore_diameter=11
    """
    if counterbore:
        CounterBoreHole(radius=diameter/2, depth=depth, 
                        counter_bore_radius=cbore_diameter/2, 
                        counter_bore_depth=cbore_depth)
    else:
        Hole(radius=diameter/2, depth=depth)


def create_mounting_tab(width=20, depth=10, thickness=3, hole_diameter=5.5):
    """
    Creates a mounting tab with a centered hole.
    
    Args:
        width: Tab width
        depth: Tab depth (how far it extends)
        thickness: Tab thickness
        hole_diameter: Mounting hole diameter
        
    Returns:
        BuildPart with the tab
    """
    with BuildPart() as tab:
        Box(width, depth, thickness, align=(Align.CENTER, Align.CENTER, Align.MIN))
        Hole(radius=hole_diameter/2, depth=thickness * 2)
        
    return tab


def create_standoff(height=10, outer_diameter=8, hole_diameter=3.4):
    """
    Creates a cylindrical standoff with a through hole.
    
    Args:
        height: Standoff height
        outer_diameter: Outer cylinder diameter
        hole_diameter: Through hole diameter (3.4 for M3)
        
    Returns:
        BuildPart with the standoff
    """
    with BuildPart() as standoff:
        Cylinder(radius=outer_diameter/2, height=height, 
                 align=(Align.CENTER, Align.CENTER, Align.MIN))
        Hole(radius=hole_diameter/2, depth=height * 1.1)
        
    return standoff


def create_mounting_boss(height=5, outer_diameter=10, hole_diameter=3.4, 
                         base_fillet=2, add_to_part=None):
    """
    Creates a mounting boss (raised cylinder for screw mounting).
    Typically used on the inside of enclosures.
    
    Args:
        height: Boss height
        outer_diameter: Outer diameter
        hole_diameter: Screw hole diameter
        base_fillet: Fillet radius at base for strength
        add_to_part: If provided, adds boss to this part
        
    Returns:
        BuildPart with the boss
    """
    with BuildPart() as boss:
        Cylinder(radius=outer_diameter/2, height=height,
                 align=(Align.CENTER, Align.CENTER, Align.MIN))
        Hole(radius=hole_diameter/2, depth=height * 1.1)
        
        # Add fillet at base for strength
        if base_fillet > 0:
            try:
                bottom_edges = boss.edges().filter_by(
                    lambda e: abs(e.center().Z) < 0.1
                )
                if bottom_edges:
                    fillet(bottom_edges, radius=base_fillet)
            except:
                pass  # Fillet may fail on small features
                
    return boss


def add_mounting_holes_grid(part, x_spacing, y_spacing, x_count, y_count, 
                            hole_diameter=5.5, depth=10, center=(0, 0, 0)):
    """
    Adds a grid of mounting holes to an existing part.
    
    Args:
        part: The BuildPart to modify
        x_spacing, y_spacing: Spacing between holes
        x_count, y_count: Number of holes in each direction
        hole_diameter: Hole diameter
        depth: Hole depth
        center: Center point of the grid (x, y, z)
        
    Returns:
        Modified BuildPart
    """
    with BuildPart() as result:
        add(part.part)
        with Locations(center):
            with GridLocations(x_spacing=x_spacing, y_spacing=y_spacing,
                              x_count=x_count, y_count=y_count):
                Hole(radius=hole_diameter/2, depth=depth)
                
    return result


# Example usage
if __name__ == "__main__":
    # Create a plate with mounting holes
    with BuildPart() as plate:
        Box(100, 60, 5, align=(Align.CENTER, Align.CENTER, Align.MIN))
        
        # Add corner mounting holes
        corner_positions = [(-40, -20, 0), (40, -20, 0), (-40, 20, 0), (40, 20, 0)]
        with Locations(corner_positions):
            create_mounting_hole(diameter=5.5, depth=10, counterbore=True)
            
    export_stl(plate.part, "outputs/mounting_plate.stl")
    print("Exported mounting_plate.stl")
