"""
Calls API Router (v1)
Handles real-time Voice and Video via WebSockets for signaling and AI voice sessions.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/calls", tags=["Calls"])

# In-memory store for WebRTC signaling connections (for future P2P/telehealth routing or Avatar connecting)
class ConnectionManager:
    def __init__(self):
        # Maps session_id -> list of active websockets
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, session_id: str, websocket: WebSocket):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)
        logger.info(f"Connected to session {session_id}")

    def disconnect(self, session_id: str, websocket: WebSocket):
        if session_id in self.active_connections:
            self.active_connections[session_id].remove(websocket)
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]
        logger.info(f"Disconnected from session {session_id}")

    async def broadcast_to_session(self, session_id: str, message: str, exclude: WebSocket = None):
        if session_id in self.active_connections:
            for connection in self.active_connections[session_id]:
                if connection != exclude:
                    await connection.send_text(message)

manager = ConnectionManager()

@router.websocket("/signaling/{session_id}")
async def webrtc_signaling(websocket: WebSocket, session_id: str):
    """
    WebRTC Signaling server for Voice and Video calls.
    Clients can exchange SDP offers, answers, and ICE candidates here.
    """
    await manager.connect(session_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Broadcast the WebRTC signaling message to the other peer(s) in the room
            await manager.broadcast_to_session(session_id, data, exclude=websocket)
    except WebSocketDisconnect:
        manager.disconnect(session_id, websocket)


@router.websocket("/ai-voice/{session_id}")
async def ai_voice_session(websocket: WebSocket, session_id: str):
    """
    Direct WebSocket connection for real-time AI Voice conversations.
    Expects base64 encoded audio or text commands.
    In a real-world scenario, this streams audio to STT, runs the Consultant Engine,
    and returns TTS audio.
    """
    await websocket.accept()
    logger.info(f"AI Voice session started for {session_id}")
    try:
        # Send initial greeting
        await websocket.send_json({
            "type": "control",
            "message": "AI Voice Session Connected. Ready for audio chunks."
        })
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            
            # Simple mock response logic for demonstration:
            if payload.get("type") == "audio":
                # Here we would normally plug in Speech-to-Text -> Consultant flow -> Text-to-Speech
                # Mocking a response
                await websocket.send_json({
                    "type": "audio",
                    "audio_base64": "MOCK_AUDIO_RESPONSE_BASE64",
                    "transcript": "I understand you're feeling anxious. Could you tell me more about what triggered this feeling?"
                })
    except WebSocketDisconnect:
        logger.info(f"AI Voice session {session_id} disconnected")
