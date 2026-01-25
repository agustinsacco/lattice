import trimesh

def check_watertight(stl_path):
    """Checks if the STL file at the given path is watertight."""
    try:
        mesh = trimesh.load(stl_path)
        return mesh.is_watertight
    except Exception as e:
        print(f"Error loading STL: {e}")
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
