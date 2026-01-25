import argparse
import sys
import os
from build123d import *
from cad_engine.utils import get_mesh_info

def generate_rpi4_enclosure(output_path):
    print("Generating Raspberry Pi 4 Enclosure...")

    # Dimensions
    pcb_width = 85
    pcb_length = 56
    wall_thickness = 2.0
    clearance = 1.0
    fillet_radius = 5.0 
    
    inner_width = pcb_width + (clearance * 2)
    inner_length = pcb_length + (clearance * 2)
    outer_width = inner_width + (wall_thickness * 2)
    outer_length = inner_length + (wall_thickness * 2)
    
    bottom_height = 16
    top_height = 10
    
    # --- PCB Standoffs ---
    standoff_height = 4.0
    standoff_radius = 3.5
    hole_positions = [
        (3.5, 3.5),
        (3.5 + 58.0, 3.5),
        (3.5, 3.5 + 49.0),
        (3.5 + 58.0, 3.5 + 49.0)
    ]
    pcb_offset_x = (inner_width - pcb_width) / 2
    pcb_offset_y = (inner_length - pcb_length) / 2
    
    adjusted_holes = []
    for hx, hy in hole_positions:
        adjusted_holes.append((hx + pcb_offset_x - inner_width/2, hy + pcb_offset_y - inner_length/2, wall_thickness))

    # --- 1. Bottom Part ---
    with BuildPart() as bottom:
        with BuildSketch():
             RectangleRounded(outer_width, outer_length, fillet_radius)
        extrude(amount=bottom_height)
        
        # Hollow
        with Locations((0, 0, wall_thickness)):
            with BuildSketch():
                 RectangleRounded(inner_width, inner_length, max(0.1, fillet_radius - wall_thickness))
            extrude(amount=bottom_height, mode=Mode.SUBTRACT)
            
        # Add Standoffs
        with Locations(adjusted_holes):
             Cylinder(radius=standoff_radius, height=standoff_height, align=(Align.CENTER, Align.CENTER, Align.MIN))
             with Locations((0, 0, standoff_height)):
                  Hole(radius=1.2, depth=standoff_height + wall_thickness)

        # Cutouts
        with Locations((outer_width/2, 0, wall_thickness + standoff_height + 1)):
            Box(wall_thickness * 3, inner_length - 8, 12, mode=Mode.SUBTRACT)
        with Locations((0, -outer_length/2, wall_thickness + standoff_height + 1)):
            Box(inner_width - 16, wall_thickness * 3, 8, mode=Mode.SUBTRACT)
        with Locations((-outer_width/2, 0, wall_thickness + standoff_height)):
             Box(wall_thickness * 3, 14, 3, mode=Mode.SUBTRACT)

        # Mounting Tabs
        with Locations((0, outer_length/2 + 5, 0), (0, -outer_length/2 - 5, 0)):
             with BuildSketch():
                  RectangleRounded(40, 10, 4)
             extrude(amount=wall_thickness)
             with Locations((15, 0, 0), (-15, 0, 0)):
                  Hole(radius=2.5, depth=wall_thickness * 2)

        # Snap fit lip
        with Locations((0, 0, bottom_height - 1.5)):
             with BuildSketch():
                  RectangleRounded(outer_width, outer_length, fillet_radius)
                  RectangleRounded(outer_width - wall_thickness/2, outer_length - wall_thickness/2, max(0.1, fillet_radius - wall_thickness/4), mode=Mode.SUBTRACT)
             extrude(amount=1.6, mode=Mode.SUBTRACT)
        
        # Snap Recesses (Simplified to cut outer wall only)
        with Locations((outer_width/2 - wall_thickness/4, 0, bottom_height - 1.2), (-outer_width/2 + wall_thickness/4, 0, bottom_height - 1.2)):
             with Locations(Rotation(0, 90, 0)):
                  Cylinder(radius=1.0, height=wall_thickness, mode=Mode.SUBTRACT)

        # Round bottom outer edge
        try:
             # Filter edges at Z=0 that are part of the outer perimeter
             bottom_edges = bottom.edges().filter_by(Plane.XY).sort_by(Axis.Z)[0:4] # Rough guess for outer perimeter
             # Safer: filter by length
             long_edges = [e for e in bottom.edges().filter_by(Plane.XY) if e.length() > 20]
             if long_edges:
                  fillet(long_edges, radius=1.0)
        except:
             pass

    # --- 2. Top Part ---
    with BuildPart() as top:
        with BuildSketch():
             RectangleRounded(outer_width, outer_length, fillet_radius)
        extrude(amount=top_height)
        
        # Hollow
        with BuildSketch():
             RectangleRounded(inner_width, inner_length, max(0.1, fillet_radius - wall_thickness))
        extrude(amount=top_height - wall_thickness, mode=Mode.SUBTRACT)

        # Lip protrusion
        with BuildSketch():
             RectangleRounded(outer_width - wall_thickness/2 - 0.2, outer_length - wall_thickness/2 - 0.2, max(0.1, fillet_radius - wall_thickness/4))
             RectangleRounded(inner_width + 0.1, inner_length + 0.1, max(0.1, fillet_radius - wall_thickness), mode=Mode.SUBTRACT)
        extrude(amount=1.4)

        # Snap Bumps
        with Locations((outer_width/2 - wall_thickness/8, 0, 0.3), (-outer_width/2 + wall_thickness/8, 0, 0.3)):
             with Locations(Rotation(0, 90, 0)):
                  Cylinder(radius=0.8, height=1.0)

        # Ventilation grid (Hexagons)
        top_face = top.faces().sort_by(Axis.Z)[-1]
        with BuildSketch(top_face):
             with GridLocations(9, 9, 8, 5):
                  RegularPolygon(radius=3.46, side_count=6, rotation=90) # 6mm across flats
        extrude(amount=-(wall_thickness + 1.0), mode=Mode.SUBTRACT)
        
        # Round the top outer edge
        try:
             # Select long edges on the top face (avoiding small hexagon edges)
             top_outer_edges = [e for e in top.faces().sort_by(Axis.Z)[-1].edges() if e.length() > 20]
             if top_outer_edges:
                  fillet(top_outer_edges, radius=1.0)
        except:
             pass

    # --- Final Assembly and Checks ---
    temp_bottom = "projects/rpi4_enclosure/bottom.stl"
    export_stl(bottom.part, temp_bottom)
    info_b = get_mesh_info(temp_bottom)
    print(f"Bottom Watertight: {info_b['is_watertight']}")

    temp_top = "projects/rpi4_enclosure/top.stl"
    export_stl(top.part, temp_top)
    info_t = get_mesh_info(temp_top)
    print(f"Top Watertight: {info_t['is_watertight']}")

    with BuildPart() as assembly:
        add(bottom.part)
        with Locations((0, outer_length + 20, 0)):
             add(top.part)

    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    export_stl(assembly.part, output_path)
    
    info = get_mesh_info(output_path)
    if info:
        print(f"STL exported to: {output_path}")
        print(f"Watertight: {info['is_watertight']}")
        print(f"Volume: {info['volume']:.2f} mm^3")
    
    if os.path.exists(temp_bottom): os.remove(temp_bottom)
    if os.path.exists(temp_top): os.remove(temp_top)

def main():
    parser = argparse.ArgumentParser(description="Generate RPi 4 Enclosure")
    parser.add_argument("--output", type=str, default="projects/rpi4_enclosure/model.stl", help="Output path")
    args = parser.parse_args()
    generate_rpi4_enclosure(args.output)

if __name__ == "__main__":
    main()
