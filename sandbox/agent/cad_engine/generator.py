import argparse
import sys
import os
from build123d import *
from cad_engine.utils import get_mesh_info

def generate_bracket(width, height, thickness, hole_diameter, fillet_rad, output_path):
    """Generates a V-slot bracket and saves it as STL."""
    
    print(f"Generating Bracket: {width}x{height}x{thickness}mm")

    with BuildPart() as model:
        # 1. Main body: L-shape Profile Extrusion
        with BuildSketch() as sketch:
            # Bottom Leg (Horizontal)
            Rectangle(width, thickness, align=(Align.MIN, Align.MIN))
            # Vertical Leg
            Rectangle(thickness, height, align=(Align.MIN, Align.MIN))
        
        # Extrude the 'L' profile to the width of the bracket (creating the depth)
        # However, the user usually thinks of "width" as the extrusion depth or the leg length?
        # Standard: 2020 bracket (20x20). 
        # Here we have width=40, height=40.
        # Let's assume params are Leg Dimensions and 'width' is the extrusion depth.
        # But wait, usually 'width' is one leg, 'height' is other leg, and 'depth' (extrusion) matches the profile width (e.g. 20mm or 40mm).
        # The previous code extruded by `bracket_width` (40).
        # Let's assume width=Leg1, height=Leg2, and Extrusion=width (Making it square).
        
        extrude(amount=width)
        
        # 2. Holes
        # We need holes on the outer faces usually.
        # Face 1: Bottom Leg (Top face of bottom leg? No, usually through the face).
        # Hole center offset from edges.
        hole_radius = hole_diameter / 2
        offset = 10

        # Hole in horizontal leg
        # Position: X = width/2 (center of extrusion), Y = offset, Z = ? 
        # Previous code: extruded in Z? NO. 
        # Previous code: Sketch on XY, Extrude(amount=width). 
        # The extrusion direction is Z. 
        # So the "Front" L-shape is on XY.
        # Thickness of legs is in Y (horizontal leg) and X (vertical leg)? 
        # No:
        # Rect(width, thickness) -> 0..width in X, 0..thickness in Y.
        # Rect(thickness, height) -> 0..thickness in X, 0..height in Y.
        # So the "L" is in the XY plane.
        # Extrusion is along Z (0..width).
        
        # Hole 1 (Horizontal Leg): 
        # We want to drill through the Thickness (Y axis).
        # Center X = ? No, usually we mount it to a rail.
        # If this is a corner bracket 20/20.
        # Hole is at X (center of leg length?), Z (center of rail?)
        # Let's place it at:
        # X = width - offset (near the tip of the leg?)
        # Z = width / 2 (Center of extrusion).
        # Drilling direction: Y axis.
        
        with Locations((width - offset, 0, width/2)):
            with Locations(Rotation(90, 0, 0)): # Rotate around X to point Y
                Hole(radius=hole_radius, depth=thickness*2) # Oversized depth to ensure cut

        # Hole 2 (Vertical Leg):
        # We want to drill through X (Thickness).
        # Center Y = height - offset (Near tip of vertical leg).
        # Z = width / 2.
        with Locations((0, height - offset, width/2)):
            with Locations(Rotation(0, 90, 0)): # Rotate to point X
                 Hole(radius=hole_radius, depth=thickness*2)
                 
        # 3. Fillets
        # Inner corner is at X=thickness, Y=thickness line.
        try:
            # Filter edges that are parallel to Z, and close to (thickness, thickness)
            inner_edges = model.edges().filter_by(Axis.Z).filter_by(
                lambda e: abs(e.center().X - thickness) < 0.1 and abs(e.center().Y - thickness) < 0.1
            )
            if inner_edges:
                fillet(inner_edges, radius=fillet_rad/2)
                
            # Outer edges if needed
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
    parser = argparse.ArgumentParser(description="Generate V-Slot Bracket")
    parser.add_argument("--width", type=float, default=40, help="Width of the bracket")
    parser.add_argument("--height", type=float, default=40, help="Height of the bracket")
    parser.add_argument("--thickness", type=float, default=4, help="Thickness of the material")
    parser.add_argument("--hole_diameter", type=float, default=5.5, help="Diameter of mounting holes")
    parser.add_argument("--fillet_radius", type=float, default=2.0, help="Radius of fillets")
    parser.add_argument("--output", type=str, default="outputs/model.stl", help="Output path")
    
    args = parser.parse_args()
    
    generate_bracket(
        args.width, 
        args.height, 
        args.thickness, 
        args.hole_diameter, 
        args.fillet_radius,
        args.output
    )

if __name__ == "__main__":
    main()
