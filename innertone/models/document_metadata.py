from sqlalchemy import Column, Integer, String, Text, JSON
from innertone.core.database import Base

class DocumentMetadata(Base):
    __tablename__ = "document_metadata"

    id = Column(Integer, primary_key=True, index=True)
    # This ID will correspond directly to the FAISS index ID
    faiss_id = Column(Integer, unique=True, index=True, nullable=False)
    
    book_name = Column(String(255), nullable=False, index=True)
    section = Column(String(255), nullable=True)
    topic = Column(String(255), nullable=True, index=True)
    
    content = Column(Text, nullable=False)
    # Metadata for additional info (page number, token count, etc)
    metadata_json = Column(JSON, nullable=True)
