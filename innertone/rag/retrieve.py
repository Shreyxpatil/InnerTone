"""
RAG Retrieval Module
Performs semantic search over the FAISS index using Gemini embeddings,
and fetches the matching document metadata from PostgreSQL.
"""
import faiss
import numpy as np
import os
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from innertone.models.document_metadata import DocumentMetadata
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from innertone.core.config import get_settings

settings = get_settings()

FAISS_INDEX_PATH = "/home/ca/Projects/InnerTone/innertone_index.faiss"

_index = None
_embedding_model = None

def _get_embedding_model() -> GoogleGenerativeAIEmbeddings:
    global _embedding_model
    if _embedding_model is None:
        _embedding_model = GoogleGenerativeAIEmbeddings(
            model=settings.EMBEDDING_MODEL_NAME,
            google_api_key=settings.GEMINI_API_KEY
        )
    return _embedding_model

def _get_faiss_index() -> faiss.Index:
    global _index
    if _index is None:
        if not os.path.exists(FAISS_INDEX_PATH):
            raise FileNotFoundError(
                f"FAISS index not found at {FAISS_INDEX_PATH}. "
                "Please run the ingestion pipeline first."
            )
        _index = faiss.read_index(FAISS_INDEX_PATH)
    return _index

async def retrieve_relevant_chunks(
    query: str,
    db: AsyncSession,
    top_k: int = 5,
) -> list[dict]:
    """
    Embeds the query, searches FAISS for nearest neighbours,
    then fetches the full metadata from the DB.
    
    Returns a list of dicts: {book_name, section, content}
    """
    model = _get_embedding_model()
    index = _get_faiss_index()
    
    # Embed the query
    query_embedding = model.embed_query(query)
    query_vector = np.array([query_embedding], dtype="float32")
    
    # Search FAISS
    distances, faiss_ids = index.search(query_vector, top_k)
    faiss_ids_flat = faiss_ids[0].tolist()
    
    # Filter out -1 (FAISS returns -1 when the index has fewer results than top_k)
    valid_ids = [fid for fid in faiss_ids_flat if fid != -1]
    
    if not valid_ids:
        return []

    # Fetch metadata from DB
    result = await db.execute(
        select(DocumentMetadata).where(DocumentMetadata.faiss_id.in_(valid_ids))
    )
    records = result.scalars().all()
    
    # Return structured context
    return [
        {
            "book_name": r.book_name,
            "section": r.section,
            "content": r.content
        }
        for r in records
    ]
