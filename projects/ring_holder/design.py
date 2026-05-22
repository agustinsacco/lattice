import argparse
import sys
import os
from build123d import *
from cad_engine.utils import get_mesh_info

def generate_ring_holder(output_path):
    """Generates a ring holder with a base tray and a central cone."""
    
    print("Generating Ring Holder with Tray")

    with BuildPart() as model:
        # 1. Create the base cylinder
        base_radius = 30
        base_height = 10
        Cylinder(radius=base_radius, height=base_height, align=(Align.CENTER, Align.CENTER, Align.MIN))
        
        # 2. Hollow it out to make a tray
        # Find the top face
        top_face = model.faces().sort_by(Axis.Z)[-1]
        # Offset to create 2mm walls and floor
        offset(amount=-2, openings=[top_face])
        
        # 3. Add the cone in the center
        # The floor thickness is 2mm (due to offset -2), so the floor is at Z=2.
        with Locations((0, 0, 2)):
            Cone(bottom_radius=8, top_radius=2, height=40, align=(Align.CENTER, Align.CENTER, Align.MIN))
            
        # Optional: Add a smooth fillet to the top rim of the tray
        try:
            # The top rim edges are at Z=10.
            rim_edges = model.edges().filter_by(lambda e: abs(e.center().Z - 10) < 0.1)
            if rim_edges:
                fillet(rim_edges, radius=0.5)
        except Exception as e:
            print(f"Fillet failed: {e}")

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
        print(f"Volume: {info['volume']:.2f}")
    else:
        print("Failed to verify STL.")

def main():
    parser = argparse.ArgumentParser(description="Generate Ring Holder")
    parser.add_argument("--output", type=str, default="projects/ring_holder/model.stl", help="Output path")
    
    args = parser.parse_args()
    
    generate_ring_holder(args.output)

if __name__ == "__main__":
    main()
