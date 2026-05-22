"""
Ventilation Pattern - Vent slots, grids, and honeycomb patterns.
"""
from build123d import *
import math


def create_vent_slots(width, height, slot_width=3, slot_length=15, 
                      gap=4, border=10, wall_thickness=3):
    """
    Creates a grid of rectangular vent slots.
    
    Args:
        width: Total area width
        height: Total area height
        slot_width: Width of each slot
        slot_length: Length of each slot
        gap: Gap between slots
        border: Solid border around edges
        wall_thickness: Thickness to cut through
        
    Returns:
        BuildPart containing the slot cutters (use with Mode.SUBTRACT)
    """
    # Calculate effective area
    eff_width = width - 2 * border
    eff_height = height - 2 * border
    
    # Calculate spacing
    x_pitch = slot_width + gap
    y_pitch = slot_length + gap
    
    x_count = max(1, int(eff_width / x_pitch))
    y_count = max(1, int(eff_height / y_pitch))
    
    with BuildPart() as slots:
        with BuildSketch():
            with GridLocations(x_spacing=x_pitch, y_spacing=y_pitch,
                              x_count=x_count, y_count=y_count):
                Rectangle(slot_width, slot_length)
        extrude(amount=wall_thickness + 2)  # Overshoot for clean cut
        
    return slots


def create_honeycomb(width, height, hex_radius=4, wall=1.2, 
                     border=10, thickness=3):
    """
    Creates a honeycomb ventilation pattern.
    
    Args:
        width: Total area width
        height: Total area height
        hex_radius: Inscribed radius of each hexagon
        wall: Wall thickness between hexagons
        border: Solid border around edges
        thickness: Thickness to cut through
        
    Returns:
        BuildPart containing the hex cutters (use with Mode.SUBTRACT)
    """
    # Calculate effective area
    eff_width = width - 2 * border
    eff_height = height - 2 * border
    
    # Hex spacing
    hex_spacing = (hex_radius * 2) + wall
    row_spacing = hex_spacing * 0.866  # sqrt(3)/2 for hex packing
    
    x_count = max(1, int(eff_width / hex_spacing))
    y_count = max(1, int(eff_height / row_spacing))
    
    # Apothem for HexLocations
    apothem = hex_radius * 0.866025
    
    with BuildPart() as honeycomb:
        with BuildSketch():
            with HexLocations(radius=apothem, x_count=x_count, y_count=y_count):
                RegularPolygon(radius=hex_radius, side_count=6)
        extrude(amount=thickness + 2)
        
    return honeycomb


def create_louvers(width, height, count=5, angle=45, 
                   louver_depth=5, wall_thickness=3):
    """
    Creates angled louver vents (like on HVAC equipment).
    
    Args:
        width: Total width
        height: Total height  
        count: Number of louver slats
        angle: Louver angle in degrees
        louver_depth: How far louvers protrude
        wall_thickness: Wall thickness
        
    Returns:
        BuildPart containing louvers (can add or subtract)
    """
    spacing = height / (count + 1)
    slat_height = spacing * 0.6
    
    positions = [(0, -height/2 + spacing * (i + 1), 0) for i in range(count)]
    
    with BuildPart() as louvers:
        with Locations(positions):
            with Locations(Rotation(angle, 0, 0)):
                Box(width, louver_depth, slat_height,
                    align=(Align.CENTER, Align.CENTER, Align.CENTER))
                    
    return louvers


def add_side_vents(part, face_axis=Axis.X, positive_side=True,
                   slot_width=3, slot_length=12, gap=4, border=10):
    """
    Adds ventilation slots to a side face of a part.
    
    Args:
        part: The BuildPart to modify
        face_axis: Which axis the face is perpendicular to (X, Y, or Z)
        positive_side: If True, uses face in positive direction
        slot_width, slot_length, gap, border: Slot parameters
        
    Returns:
        Modified BuildPart with vents
    """
    # Get the bounding box
    bbox = part.part.bounding_box()
    
    # Determine face position and vent area dimensions based on axis
    if face_axis == Axis.X:
        face_pos = bbox.max.X if positive_side else bbox.min.X
        vent_width = bbox.max.Y - bbox.min.Y
        vent_height = bbox.max.Z - bbox.min.Z
        plane = Plane.YZ.offset(face_pos)
        
    elif face_axis == Axis.Y:
        face_pos = bbox.max.Y if positive_side else bbox.min.Y
        vent_width = bbox.max.X - bbox.min.X
        vent_height = bbox.max.Z - bbox.min.Z
        plane = Plane.XZ.offset(face_pos)
        
    else:  # Axis.Z
        face_pos = bbox.max.Z if positive_side else bbox.min.Z
        vent_width = bbox.max.X - bbox.min.X
        vent_height = bbox.max.Y - bbox.min.Y
        plane = Plane.XY.offset(face_pos)
    
    # Create vent slots on the appropriate plane
    eff_width = vent_width - 2 * border
    eff_height = vent_height - 2 * border
    x_pitch = slot_width + gap
    y_pitch = slot_length + gap
    x_count = max(1, int(eff_width / x_pitch))
    y_count = max(1, int(eff_height / y_pitch))
    
    wall_thickness = 5  # Generous overshoot
    
    with BuildPart() as cutter:
        with BuildSketch(plane):
            with GridLocations(x_spacing=x_pitch, y_spacing=y_pitch,
                              x_count=x_count, y_count=y_count):
                # Offset to center on face
                if face_axis == Axis.X:
                    with Locations((0, (bbox.max.Z + bbox.min.Z)/2)):
                        Rectangle(slot_width, slot_length)
                elif face_axis == Axis.Y:
                    with Locations((0, (bbox.max.Z + bbox.min.Z)/2)):
                        Rectangle(slot_width, slot_length)
                else:
                    Rectangle(slot_width, slot_length)
        extrude(amount=wall_thickness)
    
    with BuildPart() as result:
        add(part.part)
        add(cutter.part, mode=Mode.SUBTRACT)
        
    return result


# Example usage
if __name__ == "__main__":
    # Create a box with honeycomb bottom
    with BuildPart() as vented_box:
        Box(100, 80, 40, align=(Align.CENTER, Align.CENTER, Align.MIN))
        
    # Create honeycomb cutter
    honeycomb = create_honeycomb(100, 80, hex_radius=4, wall=1.2, border=10, thickness=5)
    
    # Position at bottom face and cut
    with BuildPart() as final:
        add(vented_box.part)
        with Locations((0, 0, -1)):  # Slightly below to ensure cut
            add(honeycomb.part, mode=Mode.SUBTRACT)
            
    export_stl(final.part, "outputs/vented_box.stl")
    print("Exported vented_box.stl")
