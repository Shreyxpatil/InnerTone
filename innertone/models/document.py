from sqlalchemy import Column, Integer, String, Text, JSON
from pgvector.sqlalchemy import Vector
from innertone.core.database import Base
from innertone.core.config import get_settings

settings = get_settings()

class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, index=True)
    book_name = Column(String(255), nullable=False, index=True)
    section = Column(String(255), nullable=True)
    topic = Column(String(255), nullable=True, index=True)
    
    content = Column(Text, nullable=False)
    # Metadata for additional info (page number, token count, etc)
    metadata_json = Column(JSON, nullable=True)
    
    # pgvector column for embeddings
    embedding = Column(Vector(settings.EMBEDDING_DIMENSIONS), nullable=False)
