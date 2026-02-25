"""
Application entry point — starts the FastAPI server with uvicorn.
"""
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "innertone.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
