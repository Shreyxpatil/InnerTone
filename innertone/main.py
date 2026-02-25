"""
FastAPI Application Entry Point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from innertone.api.v1.chat import router as chat_router

def create_app() -> FastAPI:
    app = FastAPI(
        title="InnerTone API",
        description="AI Mental Wellness Consultation Platform",
        version="0.1.0",
    )

    # CORS — allow all origins in dev, restrict in prod
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routers
    app.include_router(chat_router, prefix="/api/v1")

    @app.get("/health", tags=["Health"])
    async def health():
        return {"status": "ok", "service": "InnerTone"}

    return app

app = create_app()
