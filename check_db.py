import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from innertone.models.memory import ConversationMessage
import json

DATABASE_URL = "postgresql+asyncpg://shreyas:password123@localhost:5432/innertone"
engine = create_async_engine(DATABASE_URL, echo=False)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def main():
    async with async_session() as db:
        result = await db.execute(
            select(ConversationMessage).order_by(ConversationMessage.created_at.desc()).limit(10)
        )
        msgs = result.scalars().all()
        for msg in reversed(msgs):
            if msg.role == "model":
                print(f"[{msg.role}] ({len(msg.content)} chars): {msg.content}")

if __name__ == "__main__":
    asyncio.run(main())
