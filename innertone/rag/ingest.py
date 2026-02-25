import os
import json
import faiss
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from innertone.core.database import AsyncSessionLocal
from innertone.models.document_metadata import DocumentMetadata
from innertone.core.config import get_settings

settings = get_settings()

BOOKS_DIR = "/home/ca/Projects/InnerTone/Books"
FAISS_INDEX_PATH = "/home/ca/Projects/InnerTone/innertone_index.faiss"

from langchain_google_genai import GoogleGenerativeAIEmbeddings

# Initialize embedding model
print(f"Loading embedding model: {settings.EMBEDDING_MODEL_NAME}")
if not settings.GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY is not set in the environment.")
    
embedding_model = GoogleGenerativeAIEmbeddings(
    model=settings.EMBEDDING_MODEL_NAME,
    google_api_key=settings.GEMINI_API_KEY
)

def load_and_chunk_pdf(file_path: str):
    """Loads a PDF and chunks it into smaller pieces."""
    print(f"Loading {file_path}...")
    loader = PyPDFLoader(file_path)
    documents = loader.load()
    
    # 400-600 tokens ~ 1600-2400 characters (rough estimate of 4 chars per token)
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=2000,
        chunk_overlap=200,
        length_function=len,
        is_separator_regex=False,
    )
    chunks = text_splitter.split_documents(documents)
    return chunks

def init_faiss_index(dimension: int):
    """Initializes or loads a FAISS index."""
    if os.path.exists(FAISS_INDEX_PATH):
        print("Loading existing FAISS index...")
        return faiss.read_index(FAISS_INDEX_PATH)
    else:
        print("Creating new FAISS index...")
        return faiss.IndexFlatL2(dimension)

async def process_books():
    """Processes all books in the directory, embeds chunks, and stores them in FAISS/DB."""
    dimension = settings.EMBEDDING_DIMENSIONS
    
    if not os.path.exists(BOOKS_DIR):
        print(f"Books directory not found at {BOOKS_DIR}")
        return
        
    pdf_files = [f for f in os.listdir(BOOKS_DIR) if f.endswith('.pdf')]
    
    if not pdf_files:
        print(f"No PDF files found in {BOOKS_DIR}")
        return

    # Load FAISS index
    index = init_faiss_index(dimension)
    
    async with AsyncSessionLocal() as session:
        for file_name in pdf_files:
            # We track the faiss_id per document since we commit after every document.
            current_faiss_id = index.ntotal
             
            file_path = os.path.join(BOOKS_DIR, file_name)
            book_name = os.path.splitext(file_name)[0]
            
            # Simple check if we already processed this by checking DB for the book name
            from sqlalchemy import select
            existing = await session.execute(select(DocumentMetadata).filter_by(book_name=book_name).limit(1))
            if existing.scalar() is not None:
                print(f"Book {book_name} already ingested, skipping.")
                continue

            chunks = load_and_chunk_pdf(file_path)[:15]  # Limit to 15 chunks for testing
            if not chunks:
                continue
                
            print(f"Generated {len(chunks)} chunks for {book_name}")
            texts = [chunk.page_content for chunk in chunks]
            
            # Embed texts for this book in batches to avoid rate limits
            print("Generating embeddings in batches (abiding by strict RPM limits)...")
            embeddings = []
            batch_size = 5  # Reduced to avoid 15RPM/TPM limits
            for k in range(0, len(texts), batch_size):
                batch = texts[k:k + batch_size]
                batch_embeddings = embedding_model.embed_documents(batch)
                embeddings.extend(batch_embeddings)
                print(f"Embedded {len(embeddings)}/{len(texts)} chunks...")
                await asyncio.sleep(5)  # Delay to respect rate limits
            
            # Add to FAISS index
            index.add(embeddings)
            
            # Save metadata to database
            for i, chunk in enumerate(chunks):
                # Basic section heuristic (e.g., page number)
                page_num = chunk.metadata.get('page', 'Unknown')
                section_name = f"Page {page_num}"
                
                # Create a local copy of metadata to safely modify
                meta_json = chunk.metadata.copy()
                meta_json["token_estimate"] = len(chunk.page_content) // 4
                
                db_record = DocumentMetadata(
                    faiss_id=current_faiss_id + i,
                    book_name=book_name,
                    section=section_name,
                    topic="general psychology",  # Placeholder, could use LLM to classify topic per chunk
                    content=chunk.page_content,
                    metadata_json=meta_json
                )
                session.add(db_record)
            
            await session.commit()
            print(f"Saved metadata to DB for {book_name}")
    
    # Save the FAISS index to disk
    faiss.write_index(index, FAISS_INDEX_PATH)
    print("Ingestion complete. FAISS index saved.")

if __name__ == "__main__":
    asyncio.run(process_books())
