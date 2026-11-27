"""数据库种子数据（可选）：maps 为空时插入一张示例地图。

用法：cd backend && python -m app.db.seed
"""

import asyncio
import logging

from sqlalchemy import func, select

from app.api.v1.git import models as _git_models  # noqa: F401  # 注册 git_repos 表（FK 目标）
from app.api.v1.mindmap.models import MapModel, NodeModel, PropModel
from app.db.session import SessionLocal

logger = logging.getLogger(__name__)


async def seed() -> None:
    async with SessionLocal() as session:
        total = (await session.execute(select(func.count()).select_from(MapModel))).scalar_one()
        if total:
            logger.info("已存在 %d 张地图，跳过种子数据", total)
            return

        map_row = MapModel(title="示例知识地图", desc="种子数据，可删除")
        session.add(map_row)
        await session.flush()

        root_node = NodeModel(map_id=map_row.id, parent_id=None, name="前端", sort_order=0)
        child_node = NodeModel(map_id=map_row.id, parent_id=None, name="后端", sort_order=1)
        session.add_all([root_node, child_node])
        await session.flush()

        session.add_all(
            [
                PropModel(
                    map_id=map_row.id,
                    node_id=root_node.id,
                    label="技术选型",
                    note_content="React 18 + TypeScript + Vite",
                    note_tags=["前端"],
                    note_remark="",
                    doc=False,
                ),
                PropModel(
                    map_id=map_row.id,
                    node_id=child_node.id,
                    label="架构说明",
                    note_content="FastAPI + SQLAlchemy 2.0 async + PostgreSQL 17",
                    note_tags=["后端"],
                    note_remark="",
                    doc=False,
                ),
            ]
        )
        await session.commit()
        logger.info("种子数据写入完成：maps=1 nodes=2 props=2")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(seed())
