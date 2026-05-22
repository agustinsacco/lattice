import trimesh

# Default printer constraints (Bambu Lab A1)
PRINTER_MAX_X = 256
PRINTER_MAX_Y = 256
PRINTER_MAX_Z = 256
MIN_WALL_THICKNESS = 1.2
MIN_HOLE_DIAMETER = 2.0


def check_watertight(stl_path):
    """Checks if the STL file at the given path is watertight."""
    try:
        mesh = trimesh.load(stl_path)
        return mesh.is_watertight
    except Exception as e:
        print(f"Error loading STL: {e}")
        return False


def check_disjoint(stl_path):
    """
    Checks if the mesh consists of multiple disconnected parts (floating geometry).
    Returns True if the mesh is split into multiple bodies (bad for checking single parts),
    False if it's a single solid.
    """
    try:
        mesh = trimesh.load(stl_path)
        # split() returns a list of meshes for each connected component
        parts = mesh.split()
        if len(parts) > 1:
            print(f"⚠ WARNING: Mesh {stl_path} contains {len(parts)} disconnected parts!")
            return True
        return False
    except Exception as e:
        print(f"Error checking disjoint bodies: {e}")
        return False



def get_mesh_info(stl_path):
    """Returns basic information about the mesh."""
    try:
        mesh = trimesh.load(stl_path)
        return {
            "is_watertight": mesh.is_watertight,
            "volume": mesh.volume,
            "area": mesh.area,
            "bounds": mesh.bounds.tolist()
        }
    except Exception as e:
        print(f"Error loading STL: {e}")
        return None


def validate_dimensions(width, height, depth, 
                        max_x=PRINTER_MAX_X, max_y=PRINTER_MAX_Y, max_z=PRINTER_MAX_Z):
    """
    Validate dimensions against printer bed limits.
    
    Args:
        width: Dimension in X axis (mm)
        height: Dimension in Y axis (mm)  
        depth: Dimension in Z axis (mm)
        max_x/y/z: Printer bed limits (defaults to 256mm)
    
    Returns:
        True if valid
        
    Raises:
        ValueError with specific error messages if invalid
    """
    errors = []
    if width > max_x:
        errors.append(f"Width {width}mm exceeds printer max X ({max_x}mm)")
    if height > max_y:
        errors.append(f"Height {height}mm exceeds printer max Y ({max_y}mm)")
    if depth > max_z:
        errors.append(f"Depth {depth}mm exceeds printer max Z ({max_z}mm)")
    
    if errors:
        raise ValueError("Dimension validation failed:\n  - " + "\n  - ".join(errors))
    
    print(f"✓ Dimensions valid: {width}x{height}x{depth}mm fits in {max_x}x{max_y}x{max_z}mm bed")
    return True


def describe_part(part):
    """
    Returns a text description of a build123d part for debugging.
    Call this after major operations to verify geometry.
    
    Args:
        part: A build123d Part object
        
    Returns:
        Dict with bounding box, counts, and volume
    """
    try:
        bbox = part.bounding_box()
        size = (
            round(bbox.max.X - bbox.min.X, 2),
            round(bbox.max.Y - bbox.min.Y, 2),
            round(bbox.max.Z - bbox.min.Z, 2)
        )
        info = {
            "bounding_box": size,
            "face_count": len(part.faces()),
            "edge_count": len(part.edges()),
            "volume": round(part.volume, 2),
        }
        print(f"Part: {size[0]}x{size[1]}x{size[2]}mm, {info['face_count']} faces, vol={info['volume']}mm³")
        return info
    except Exception as e:
        print(f"Error describing part: {e}")
        return None


def check_printability(stl_path, max_x=PRINTER_MAX_X, max_y=PRINTER_MAX_Y, max_z=PRINTER_MAX_Z):
    """
    Comprehensive printability check for an exported STL.
    
    Checks:
    - Watertight mesh (no holes)
    - Fits within printer bed
    - Positive volume (not inside-out)
    
    Returns:
        Dict with check results and any warnings
    """
    try:
        mesh = trimesh.load(stl_path)
        bounds = mesh.bounds
        size = bounds[1] - bounds[0]  # max - min
        
        results = {
            "is_watertight": mesh.is_watertight,
            "volume": round(mesh.volume, 2),
            "size_mm": [round(s, 2) for s in size],
            "fits_printer": all([
                size[0] <= max_x,
                size[1] <= max_y,
                size[2] <= max_z
            ]),
            "warnings": []
        }
        
        if not results["is_watertight"]:
            results["warnings"].append("Mesh is not watertight - may have holes or gaps")
        
        if results["volume"] <= 0:
            results["warnings"].append("Negative or zero volume - normals may be inverted")
        
        # Check for disjoint bodies (floating parts)
        parts = mesh.split()
        if len(parts) > 1:
             results["warnings"].append(f"Model has {len(parts)} disjoint parts (floating geometry?)")

        if not results["fits_printer"]:
            results["warnings"].append(
                f"Model size {results['size_mm']} exceeds printer bed {[max_x, max_y, max_z]}"
            )
        
        # Print summary
        status = "✓" if not results["warnings"] else "⚠"
        print(f"{status} Printability check for {stl_path}:")
        print(f"  Size: {results['size_mm'][0]}x{results['size_mm'][1]}x{results['size_mm'][2]}mm")
        print(f"  Volume: {results['volume']}mm³")
        print(f"  Watertight: {results['is_watertight']}")
        print(f"  Fits printer: {results['fits_printer']}")
        
        for warning in results["warnings"]:
            print(f"  ⚠ {warning}")
            
        return results
        
    except Exception as e:
        print(f"Error checking printability: {e}")
        return None
