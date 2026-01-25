"""
Joinery Pattern - Split parts with alignment features.
"""
from build123d import *


def split_with_tenons(part, split_plane=Plane.YZ, 
                      tenon_positions=None, tenon_size=(8, 10, 3),
                      clearance=0.2):
    """
    Splits a part in half and adds mortise/tenon joinery for alignment.
    
    Args:
        part: The BuildPart to split
        split_plane: Plane to split along (Plane.YZ, Plane.XZ, etc.)
        tenon_positions: List of (x,y,z) positions for tenons along the seam
                        If None, places one at center
        tenon_size: (width, depth, height) of each tenon
        clearance: Gap for fit (0.2mm for snug, 0.3mm for loose)
        
    Returns:
        Tuple of (left_part, right_part) with joinery
    """
    tw, td, th = tenon_size
    
    # Default: single tenon at center
    if tenon_positions is None:
        tenon_positions = [(0, 0, th/2)]
    
    # Split the part
    with BuildPart() as left:
        add(part.part)
        split(bisect_by=split_plane, keep=Keep.BOTTOM)
        
    with BuildPart() as right:
        add(part.part)
        split(bisect_by=split_plane, keep=Keep.TOP)
    
    # Create tenon objects (added to right part)
    with BuildPart() as tenons:
        for pos in tenon_positions:
            with Locations(pos):
                Box(tw, td, th)
    
    # Create mortise cutters (cut from left part) with clearance
    with BuildPart() as mortises:
        for pos in tenon_positions:
            with Locations(pos):
                Box(tw + clearance, td + clearance, th + clearance)
    
    # Apply joinery
    with BuildPart() as right_with_tenons:
        add(right.part)
        add(tenons.part)
        
    with BuildPart() as left_with_mortises:
        add(left.part)
        add(mortises.part, mode=Mode.SUBTRACT)
        
    return left_with_mortises, right_with_tenons


def create_lap_joint(left_part, right_part, 
                     lap_depth=1.5, lap_height_ratio=0.5,
                     clearance=0.15):
    """
    Adds a lap joint (overlapping step) to mating edges of split parts.
    
    The left part gets an outer step cut, the right part gets an inner step cut,
    so when assembled, they overlap for a stronger joint.
    
    Args:
        left_part: Left BuildPart (already split)
        right_part: Right BuildPart (already split)
        lap_depth: How deep the step is (X direction)
        lap_height_ratio: What fraction of height the step covers (0.5 = half)
        clearance: Gap for fit
        
    Returns:
        Tuple of (left_with_lap, right_with_lap)
    """
    # Get part height from bounding box
    bbox = left_part.part.bounding_box()
    height = bbox.max.Z - bbox.min.Z
    length = bbox.max.Y - bbox.min.Y
    
    lap_height = height * lap_height_ratio
    
    # Left: cut step from outer surface (leaves inner lip)
    with BuildPart() as left_with_lap:
        add(left_part.part)
        with Locations((-lap_depth/2, 0, height - lap_height/2)):
            Box(lap_depth, length, lap_height, mode=Mode.SUBTRACT)
    
    # Right: cut step from inner surface (leaves outer lip that overlaps)
    with BuildPart() as right_with_lap:
        add(right_part.part)
        with Locations((lap_depth/2 + clearance/2, 0, lap_height/2)):
            Box(lap_depth + clearance, length, lap_height + clearance, mode=Mode.SUBTRACT)
    
    return left_with_lap, right_with_lap


def create_dovetail_key(length=20, width=8, height=5, angle=10):
    """
    Creates a dovetail-shaped alignment key.
    
    Args:
        length: Key length
        width: Base width
        height: Key height  
        angle: Dovetail angle in degrees
        
    Returns:
        BuildPart with the dovetail key
    """
    import math
    
    # Calculate top width based on angle
    taper = height * math.tan(math.radians(angle))
    top_width = width - 2 * taper
    
    with BuildPart() as key:
        with BuildSketch() as sk:
            # Trapezoid profile
            with BuildLine():
                Polyline([
                    (-width/2, 0),
                    (width/2, 0),
                    (top_width/2, height),
                    (-top_width/2, height),
                    (-width/2, 0)
                ])
            make_face()
        extrude(amount=length)
        
    return key


# Example usage
if __name__ == "__main__":
    # Create a box and split it with joinery
    with BuildPart() as box:
        Box(100, 80, 40, align=(Align.CENTER, Align.CENTER, Align.MIN))
        
    # Split with tenons
    left, right = split_with_tenons(
        box, 
        tenon_positions=[(0, -20, 5), (0, 0, 5), (0, 20, 5)],
        tenon_size=(8, 10, 3)
    )
    
    export_stl(left.part, "outputs/joinery_left.stl")
    export_stl(right.part, "outputs/joinery_right.stl")
    print("Exported joinery_left.stl and joinery_right.stl")
