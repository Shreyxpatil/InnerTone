import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from innertone.core.database import Base, engine
# Import the model to ensure it is registered with Base.metadata
from innertone.models.document import DocumentChunk

async def init_models():
    async with engine.begin() as conn:
        print("Creating extensions if they do not exist...")
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        print("Creating all tables...")
        await conn.run_sync(Base.metadata.create_all)
    print("Database initialization complete.")

if __name__ == "__main__":
    from sqlalchemy import text
    asyncio.run(init_models())
