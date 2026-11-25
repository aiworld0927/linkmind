from fastapi import APIRouter
from utils.response import success_response
from database.neo4j_connection import test_neo4j_connection
from database.pg import test_pg_connection

health_router = APIRouter()


@health_router.get("/health")
async def health_check():
    return success_response(data={"status": "healthy"})


@health_router.get("/health/neo4j")
async def neo4j_health_check():
    result = await test_neo4j_connection()
    return success_response(data=result)


@health_router.get("/health/postgres")
async def postgres_health_check():
    result = await test_pg_connection()
    return success_response(data=result)