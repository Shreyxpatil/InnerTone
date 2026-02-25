import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from innertone.core.database import Base, engine
# Import the model to ensure it is registered with Base.metadata
from innertone.models.document_metadata import DocumentMetadata
from innertone.models.memory import ConversationMessage
from innertone.models.emotion import EmotionRecord
from innertone.models.booking import Appointment

async def init_models():
    async with engine.begin() as conn:
        print("Creating all tables...")
        await conn.run_sync(Base.metadata.create_all)
    print("Database initialization complete.")

if __name__ == "__main__":
    from sqlalchemy import text
    asyncio.run(init_models())
