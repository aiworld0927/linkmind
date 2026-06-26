from repositories.expand_repository import get_node_neighborhood, find_shortest_path
from typing import Optional, Dict


async def expand_neighborhood(node_id: str, depth: int = 1, type_filter: Optional[str] = None) -> Dict:
    if depth < 1 or depth > 3:
        raise ValueError("Depth must be between 1 and 3")
    return await get_node_neighborhood(node_id, depth, type_filter)


async def find_path(source_id: str, target_id: str) -> Dict:
    if source_id == target_id:
        raise ValueError("Source and target cannot be the same")
    return await find_shortest_path(source_id, target_id)