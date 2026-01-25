import argparse
import sys
import os
from build123d import *
from cad_engine.utils import get_mesh_info

# Printer Specifications
PRINTER_MAX_X = 256
PRINTER_MAX_Y = 256
PRINTER_MAX_Z = 256

def generate_standoff(output_path):
    """Generates a snap-fit standoff for the mounting grid."""
    print("Generating Modular Standoff...")
    with BuildPart() as standoff:
        Cylinder(radius=3, height=6, align=(Align.CENTER, Align.CENTER, Align.MIN))
        with Locations((0,0,-3)):
            Cylinder(radius=1.4, height=3, align=(Align.CENTER, Align.CENTER, Align.MIN))
        with Locations((0,0,6)):
            Hole(radius=1.1, depth=5) 
            
    export_stl(standoff.part, output_path)
    print(f"Exported Standoff: {output_path}")

def generate_case(width, length, height, output_path):
    """Generates a computer case with mortise/tenon joinery and internal top flanges."""
    
    print(f"Generating Computer Case: {width}x{length}x{height}mm")
    
    # 1. Base Geometry
    with BuildPart() as full_case:
        # Main Block (Centered on X/Y, Sitting on Z=0)
        Box(width, length, height, align=(Align.CENTER, Align.CENTER, Align.MIN))
        
        # Hollow (3mm walls)
        top_face = full_case.faces().sort_by(Axis.Z)[-1]
        offset(amount=-3, openings=[top_face])
        
        # CHANGE #3: Hexagonal Honeycomb Ventilation Pattern
        # Applied to bottom surface and left-side wall
        # 1.2mm wall thickness between hexagons, 70% coverage, 10mm solid border
        
        # Hexagon parameters
        hex_wall_thickness = 1.2  # mm
        hex_radius = 4.0  # Inscribed radius of each hexagon
        hex_spacing = (hex_radius * 2) + hex_wall_thickness  # Center-to-center
        border = 10  # Solid border around edges
        wall_thickness = 3  # Case wall thickness
        
        # Calculate grid bounds (staying within border)
        bottom_x_min = -width/2 + border
        bottom_x_max = width/2 - border
        bottom_y_min = -length/2 + border
        bottom_y_max = length/2 - border
        
        # Hex grid uses offset rows for proper honeycomb
        row_spacing_y = hex_spacing * 0.866  # sqrt(3)/2 for hex packing
        
        # Bottom Face Honeycomb - Create hex cutters
        # Use HexLocations for efficiency
        # Calculate counts
        # Effective width/length for holes
        eff_width = width - (2 * border)
        eff_length = length - (2 * border)
        
        # Hex spacing X = hex_spacing. Y = row_spacing_y.
        # Estimate counts
        hex_x_count = int(eff_width / hex_spacing)
        hex_y_count = int(eff_length / row_spacing_y)
        
        # Apothem for HexLocations (distance from center to midpoint of side)
        # hex_radius is circumradius (center to vertex). 
        # apothem = hex_radius * sqrt(3)/2
        apothem = hex_radius * 0.866025
        
        
        # CHANGE #1: Apply 2mm chamfer to all external top edges
        # Moved before ventilation/feet to ensure robust edge selection
        # External top edges are where Z = height
        # Also chamfer the vertical outer corners
        
        outer_x = width / 2
        outer_y = length / 2
        
        def is_outer_edge(edge):
            cx, cy, cz = edge.center().X, edge.center().Y, edge.center().Z
            # Top horizontal edges (Z = height)
            if abs(cz - height) < 0.5:
                if abs(abs(cx) - outer_x) < 0.5 or abs(abs(cy) - outer_y) < 0.5:
                    return True
            # Vertical corner edges
            if abs(abs(cx) - outer_x) < 0.5 and abs(abs(cy) - outer_y) < 0.5:
                return True
            # Bottom horizontal edges (Z = 0)
            if abs(cz) < 0.5:
                if abs(abs(cx) - outer_x) < 0.5 or abs(abs(cy) - outer_y) < 0.5:
                    return True
            return False
        
        outer_edges = full_case.edges().filter_by(is_outer_edge)
        if outer_edges:
            chamfer(outer_edges, length=2)
            print("Applied 2mm chamfer to external edges")

        # 2. Industrial Front Panel (Fins + Handles)
        # Applied to Front Face (Y = -length/2)
        print("Generating Industrial Front Panel...")
        
        # Parameters
        front_y = -length/2
        fin_depth = 5 # How far they stick out
        fin_width = 3
        fin_gap = 5
        handle_width = 15
        handle_depth = 8 # Reduced for low-profile look
        handle_gap = 30 # Space from edge for handle
        
        # Vertical Fins
        eff_fin_start_x = -width/2 + handle_gap + handle_width + 5
        eff_fin_end_x = width/2 - (handle_gap + handle_width + 5)
        current_x = eff_fin_start_x
        
        fin_positions = []
        while current_x <= eff_fin_end_x:
            fin_positions.append((current_x, front_y - fin_depth/2, height/2))
            current_x += (fin_width + fin_gap)
            
        with BuildPart() as fins:
            with Locations(fin_positions):
                # Vertical fins centered at Z=height/2 (20)
                Box(fin_width, fin_depth, height - 4) # Slightly shorter than full height
        
        # Handles (Left and Right)
        handle_x_left = -width/2 + handle_gap/2 + handle_width/2
        handle_x_right = width/2 - handle_gap/2 - handle_width/2
        
        # Handle Geometry
        with BuildPart() as handles:
            with Locations([(handle_x_left, front_y - handle_depth/2, height/2), 
                            (handle_x_right, front_y - handle_depth/2, height/2)]):
                Box(handle_width, handle_depth, height)
                # Grip Cutout
                with Locations((0, 0, 0)):
                    Box(handle_width + 2, handle_depth - 6, height - 15, mode=Mode.SUBTRACT)

        # Union to Case
        with BuildPart() as case_with_front:
            add(full_case.part)
            add(fins.part)
            add(handles.part)
        
        full_case = case_with_front
        print("Applied Industrial Front Panel")

    # 2. Split Logic
    with BuildPart() as left_part:
        add(full_case.part)
        split(bisect_by=Plane.YZ, keep=Keep.BOTTOM)
        
    with BuildPart() as right_part:
        add(full_case.part)
        split(bisect_by=Plane.YZ, keep=Keep.TOP)

    # CHANGE #2: Lap Joint (overlapping step) on mating edges
    # Creates an interlocking step along the vertical walls at X=0
    # Left Part: Step cut from the OUTSIDE (leaves inner lip)
    # Right Part: Step cut from the INSIDE (leaves outer lip)
    # When assembled, the right's outer lip overlaps the left's inner lip
    
    lap_depth = 1.5  # How deep the step is (X direction)
    lap_height = height / 2  # Step covers the top half of the wall
    lap_clearance = 0.15  # Tolerance for fit
    
    # Left Part: Cut a step from the outer surface of the mating wall
    # The mating wall is at X=0. Outer surface is at X=0 (after split).
    # We remove material from X=0 to X=-lap_depth, from Z=(height/2) to Z=height
    # Along the entire Y span (front wall to back wall inner surfaces)
    
    with BuildPart() as left_with_lap:
        add(left_part.part)
        # Cutter block: positioned at X = -lap_depth/2 (so it spans X=0 to X=-lap_depth)
        # Y spans the full length, Z spans top half
        with Locations((-lap_depth/2, 0, height - lap_height/2)):
            Box(lap_depth, length, lap_height, mode=Mode.SUBTRACT)
    
    # Right Part: Cut a step from the inner surface of the mating wall
    # We remove material from X=0 to X=+lap_depth, from Z=0 to Z=(height/2)
    # This leaves the top half protruding (the outer lip that overlaps the left)
    
    with BuildPart() as right_with_lap:
        add(right_part.part)
        # Cutter block: positioned at X = +lap_depth/2
        # Add clearance to make the protruding lip slightly smaller
        with Locations((lap_depth/2 + lap_clearance/2, 0, lap_height/2)):
            Box(lap_depth + lap_clearance, length, lap_height + lap_clearance, mode=Mode.SUBTRACT)
    
    left_part = left_with_lap
    right_part = right_with_lap
    print("Applied lap joint to mating edges")

    # 3. Mortise and Tenon System (Along the Floor Seam)
    tenon_y_positions = [-length/2 + 40, -length/4, 0, length/4, length/2 - 40]
    
    # Tenon Object (Add to Right)
    # Extends from X=-5 to X=+3 (8mm long, centered at -1) to ensure 3mm robust overlap with Right Part
    with BuildPart() as tenons_obj:
        with Locations([(0, y, 1.5) for y in tenon_y_positions]):
             with Locations((-1, 0, 0)):
                 Box(8, 10, 1.5) 

    # 3.1 Apply Tenons to Right Part (add)
    with BuildPart() as right_final:
        add(right_part.part)
        add(tenons_obj.part)

    # 3.2 Cut Mortises in Left Part
    # Cuts only the protruding part (X=-5.2 to X=0) plus clearance
    with BuildPart() as cutters:
        with Locations([(0, y, 1.5) for y in tenon_y_positions]):
             with Locations((-2.6, 0, 0)):
                 Box(5.2, 10.4, 1.9) # Clearance included

    with BuildPart() as left_final:
        add(left_part.part)
        add(cutters.part, mode=Mode.SUBTRACT)

    # 4. Internal Top Bolt Flanges
    flange_h = 10
    flange_d = 10
    flange_w = 12
    
    z_pos = height - flange_h/2
    
    front_y_center = (-length/2 + 3) + flange_d/2
    back_y_center = (length/2 - 3) - flange_d/2
    
    internal_flange_y_centers = [front_y_center, back_y_center]
    
    for y_center in internal_flange_y_centers:
        with BuildPart() as l_flange:
            # Offset by lap_depth to avoid interference with the joint
            with Locations((-flange_w/2 - lap_depth, y_center, z_pos)): 
                Box(flange_w, flange_d, flange_h)
                
        with BuildPart() as r_flange:
            # Offset by lap_depth to avoid interference with the joint
            with Locations((flange_w/2 + lap_depth, y_center, z_pos)): 
                Box(flange_w, flange_d, flange_h)
                
        with BuildPart() as left_combined:
            add(left_final.part)
            add(l_flange.part)
            
        with BuildPart() as right_combined:
            add(right_final.part)
            add(r_flange.part)
            
        left_final = left_combined
        right_final = right_combined

    # 5. Drill Bolt Holes through the Internal Flanges
    # Positions updated to match flange offsets
    with BuildPart() as l_drilled:
        add(left_final.part)
        for y_center in internal_flange_y_centers:
             with Locations((-flange_w/2 - lap_depth, y_center, z_pos)):
                 with Locations(Rotation(0, 90, 0)):
                     Hole(radius=1.7, depth=flange_w*2)

    with BuildPart() as r_drilled:
        add(right_final.part)
        for y_center in internal_flange_y_centers:
             with Locations((flange_w/2 + lap_depth, y_center, z_pos)):
                 with Locations(Rotation(0, 90, 0)):
                     Hole(radius=1.7, depth=flange_w*2)

    # 6. Side Wall Ventilation (Applied Post-Split)
    # Slots on outer X faces of each half
    print("Applying Side Wall Ventilation...")
    
    # Vent parameters
    vent_slot_w = 3
    vent_slot_l = 12
    vent_gap = 4
    vent_border = 10
    wall_thickness = 3
    
    # Calculate vent grid for side walls
    # Side wall area: length (Y) x height (Z)
    vent_area_y = length - 2 * vent_border
    vent_area_z = height - 2 * vent_border
    
    y_pitch = vent_slot_w + vent_gap
    z_pitch = vent_slot_l + vent_gap
    
    y_count = max(1, int(vent_area_y / y_pitch))
    z_count = max(1, int(vent_area_z / z_pitch))
    
    # Left Part: Vents on X = -width/2 face
    # Create cutter on YZ plane at outer X position
    with BuildPart() as left_vent_cutter:
        with BuildSketch(Plane.YZ.offset(-width/2)):
            with GridLocations(x_spacing=y_pitch, y_spacing=z_pitch, 
                               x_count=y_count, y_count=z_count):
                with Locations((0, height/2)):  # Center vertically
                    Rectangle(vent_slot_w, vent_slot_l)
        extrude(amount=wall_thickness + 2)  # Through the wall
    
    with BuildPart() as l_with_vents:
        add(l_drilled.part)
        add(left_vent_cutter.part, mode=Mode.SUBTRACT)
    
    # Right Part: Vents on X = +width/2 face
    with BuildPart() as right_vent_cutter:
        with BuildSketch(Plane.YZ.offset(width/2 - wall_thickness)):
            with GridLocations(x_spacing=y_pitch, y_spacing=z_pitch,
                               x_count=y_count, y_count=z_count):
                with Locations((0, height/2)):
                    Rectangle(vent_slot_w, vent_slot_l)
        extrude(amount=wall_thickness + 2)
    
    with BuildPart() as r_with_vents:
        add(r_drilled.part)
        add(right_vent_cutter.part, mode=Mode.SUBTRACT)
    
    print("Applied Side Wall Ventilation")
    
    # 7. Back Wall Cable Passthrough Holes
    # Two large rectangles on back face (Y = +length/2)
    print("Moving Cable Passthrough Holes to the Back Wall...")
    
    cable_hole_w = 40  # Width of each cable hole
    cable_hole_h = 20  # Height of each cable hole
    back_y_center = length/2
    wall_thickness = 3
    
    # Left half cable hole
    with BuildPart() as left_cable_cutter:
        # Position box so it overlaps the back wall (Y=80 to Y=83)
        # Center at Y = back_y_center - wall_thickness/2 + alignment_buffer
        with Locations((-width/4, back_y_center, height/2)):
            Box(cable_hole_w, 10, cable_hole_h) # 10mm deep cutter to ensure clean through-cut
    
    with BuildPart() as l_final_vented:
        add(l_with_vents.part)
        add(left_cable_cutter.part, mode=Mode.SUBTRACT)
    
    # Right half cable hole
    with BuildPart() as right_cable_cutter:
        with Locations((width/4, back_y_center, height/2)):
            Box(cable_hole_w, 10, cable_hole_h)
    
    with BuildPart() as r_final_vented:
        add(r_with_vents.part)
        add(right_cable_cutter.part, mode=Mode.SUBTRACT)
    
    print("Applied Back Cable Passthrough Holes")
                     
    # 8. Export
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    export_stl(l_final_vented.part, output_path.replace(".stl", "_left.stl"))
    export_stl(r_final_vented.part, output_path.replace(".stl", "_right.stl"))
    
    print(f"Exported: {output_path.replace('.stl', '_left.stl')}")
    print(f"Exported: {output_path.replace('.stl', '_right.stl')}")
    
    # Generate the standoff accessory
    generate_standoff(os.path.join(os.path.dirname(output_path), "standoff.stl"))

def main():
    parser = argparse.ArgumentParser(description="Generate Computer Case")
    parser.add_argument("--width", type=float, default=366)
    parser.add_argument("--length", type=float, default=166)
    parser.add_argument("--height", type=float, default=40)
    parser.add_argument("--output", type=str, default="projects/computer_case/model.stl")
    
    args = parser.parse_args()
    
    generate_case(
        args.width, 
        args.length,
        args.height, 
        args.output
    )

if __name__ == "__main__":
    main()
