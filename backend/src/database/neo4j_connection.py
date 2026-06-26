from neo4j import AsyncGraphDatabase, exceptions
from config.settings import settings

driver = None


async def get_driver():
    global driver
    if driver is None:
        driver = AsyncGraphDatabase.driver(
            settings.NEO4J_URI,
            auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
        )
    return driver


async def test_neo4j_connection():
    try:
        driver = await get_driver()
        async with driver.session() as session:
            result = await session.run("RETURN 1 AS test")
            record = await result.single()
            if record and record["test"] == 1:
                return {"connected": True, "message": "Neo4j connection successful"}
            else:
                return {"connected": False, "message": "Neo4j query failed"}
    except exceptions.AuthError:
        return {"connected": False, "message": "Neo4j authentication failed"}
    except exceptions.ServiceUnavailable:
        return {"connected": False, "message": "Neo4j service unavailable"}
    except Exception as e:
        return {"connected": False, "message": f"Neo4j connection error: {str(e)}"}


async def close_driver():
    global driver
    if driver is not None:
        await driver.close()
        driver = None