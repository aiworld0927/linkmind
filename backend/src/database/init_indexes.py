from database.neo4j_connection import get_driver
import logging

logger = logging.getLogger(__name__)


async def create_fulltext_index():
    """
    创建Neo4j全文索引（title+content）
    用于支持笔记的全文搜索功能
    """
    driver = await get_driver()
    
    async with driver.session() as session:
        # 检查索引是否已存在
        check_query = """
            SHOW INDEXES
            YIELD name, type
            WHERE type = 'FULLTEXT' AND name = 'noteFulltextIndex'
            RETURN name
        """
        result = await session.run(check_query)
        existing = await result.single()
        
        if existing:
            logger.info("全文索引 noteFulltextIndex 已存在，无需创建")
            return
        
        # 创建全文索引
        create_query = """
            CREATE FULLTEXT INDEX noteFulltextIndex
            FOR (n:Note)
            ON EACH [n.title, n.content]
        """
        
        try:
            await session.run(create_query)
            logger.info("全文索引 noteFulltextIndex 创建成功")
        except Exception as e:
            logger.warning(f"创建全文索引时出现警告: {e}")
            # 索引可能已存在，忽略错误


async def init_database_indexes():
    """
    初始化数据库索引
    """
    await create_fulltext_index()
    logger.info("数据库索引初始化完成")