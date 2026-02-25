import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from innertone.services.consultant import get_consultant_response
from sqlalchemy.ext.asyncio import AsyncSession

async def main():
    engine = create_async_engine("postgresql+asyncpg://shreyas:password123@localhost:5432/innertone", echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        res = await get_consultant_response("I had a breakup", [], db)
        print("----------")
        print("RESPONSE LENGTH:", len(res["response"]))
        print("RESPONSE CONTENT:", res["response"])
        print("----------")

asyncio.run(main())
