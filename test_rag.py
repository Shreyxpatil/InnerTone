import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from innertone.rag.retrieve import retrieve_relevant_chunks
from innertone.core.database import get_db

async def test_rag():
    engine = create_async_engine("postgresql+asyncpg://shreyas:password123@localhost:5432/innertone", echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        print("Testing RAG retrieval for query: 'How to deal with anxiety?'")
        try:
            chunks = await retrieve_relevant_chunks("How to deal with anxiety?", db, top_k=4)
            print(f"Retrieved {len(chunks)} chunks.")
            for i, chunk in enumerate(chunks):
                print(f"\n--- Chunk {i+1} ---")
                print(f"Book: {chunk.get('book_name')}")
                print(f"Section: {chunk.get('section')}")
                print(f"Content snippet: {chunk.get('content')[:150]}...")
        except Exception as e:
            print(f"RAG Retrieval failed with exception: {repr(e)}")

asyncio.run(test_rag())
