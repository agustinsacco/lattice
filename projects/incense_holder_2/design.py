import argparse
import sys
import os
import math
from build123d import *
from cad_engine.utils import get_mesh_info

def generate_incense_holder(height, radius, wall_thickness, hole_radius, output_path):
    """Generates an incense holder that stands vertically with holes all around."""
    
    print(f"Generating Incense Holder: {radius*2}mm diameter, {height}mm height")

    with BuildPart() as model:
        # 1. Main body: A tall cylinder
        Cylinder(radius=radius, height=height, align=(Align.CENTER, Align.CENTER, Align.MIN))
        
        # 2. Hollow it out
        # We want to keep the bottom closed (for the ash and to hold the stick)
        # So we shell from the top face
        top_face = model.faces().sort_by(Axis.Z)[-1]
        offset(amount=-wall_thickness, openings=[top_face])
        
        # 3. Add a small holder inside at the bottom
        # A small pedestal with a hole for the stick
        with Locations((0, 0, wall_thickness)):
            Cylinder(radius=6, height=15, align=(Align.CENTER, Align.CENTER, Align.MIN))
            # Drill the stick hole (3mm diameter, 12mm deep)
            Hole(radius=1.5, depth=12)
            
        # 4. Holes all around the body for smoke to escape
        hole_start_z = 30
        hole_end_z = height - 15
        z_spacing = 12
        num_layers = int((hole_end_z - hole_start_z) / z_spacing)
        holes_per_layer = 10
        
        for i in range(num_layers):
            z = hole_start_z + i * z_spacing
            # Alternate rotation for each layer for a staggered pattern
            angle_offset = (i % 2) * (360 / holes_per_layer / 2)
            
            for j in range(holes_per_layer):
                angle = j * (360 / holes_per_layer) + angle_offset
                # Position on the cylinder surface
                with Locations(Rotation(0, 0, angle)):
                    with Locations((radius, 0, z)):
                        with Locations(Rotation(0, 90, 0)):
                            # Use Cylinder as a subtraction to create holes through the wall
                            Cylinder(radius=hole_radius, height=wall_thickness * 4, mode=Mode.SUBTRACT)

        # 5. Add a wider base for stability
        with Locations((0, 0, 0)):
            Cylinder(radius=radius + 20, height=wall_thickness * 2, align=(Align.CENTER, Align.CENTER, Align.MIN))
            # Optional: chamfer the base for aesthetics
            try:
                # Top edge of the base
                base_top_edges = model.edges().filter_by(lambda e: abs(e.center().Z - wall_thickness*2) < 0.1)
                if base_top_edges:
                    chamfer(base_top_edges, length=2)
            except:
                pass

    # Export
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    export_stl(model.part, output_path)
    
    # Verify
    info = get_mesh_info(output_path)
    if info:
        print(f"STL exported to: {output_path}")
        print(f"Watertight: {info['is_watertight']}")
        print(f"Volume: {info['volume']:.2f} mm^3")
    else:
        print("Failed to verify STL.")

def main():
    parser = argparse.ArgumentParser(description="Generate Incense Holder 2")
    parser.add_argument("--height", type=float, default=200, help="Total height")
    parser.add_argument("--radius", type=float, default=25, help="Main body radius")
    parser.add_argument("--wall_thickness", type=float, default=2.5, help="Wall thickness")
    parser.add_argument("--hole_radius", type=float, default=2.5, help="Smoke hole radius")
    parser.add_argument("--output", type=str, default="projects/incense_holder_2/model.stl", help="Output path")
    
    args = parser.parse_args()
    
    generate_incense_holder(
        args.height, 
        args.radius, 
        args.wall_thickness, 
        args.hole_radius,
        args.output
    )

if __name__ == "__main__":
    main()
