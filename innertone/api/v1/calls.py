"""
Calls API Router (v1)
Handles real-time Voice and Video via WebSockets for signaling and AI voice sessions.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import logging
import asyncio

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/calls", tags=["Calls"])

# In-memory store for WebRTC signaling connections (for future P2P/telehealth routing or Avatar connecting)
class ConnectionManager:
    def __init__(self):
        # Maps session_id -> set of active websockets
        self.rooms: dict[str, set[WebSocket]] = {}

    async def connect(self, session_id: str, websocket: WebSocket):
        await websocket.accept()
        if session_id not in self.rooms:
            self.rooms[session_id] = set()
        self.rooms[session_id].add(websocket)
        logger.info(f"Connected to room {session_id}. Total peers: {len(self.rooms[session_id])}")

    def disconnect(self, session_id: str, websocket: WebSocket):
        if session_id in self.rooms:
            self.rooms[session_id].discard(websocket)
            if not self.rooms[session_id]:
                del self.rooms[session_id]
        logger.info(f"Disconnected from room {session_id}")

    async def broadcast_to_room(self, session_id: str, message: str, exclude: WebSocket = None):
        if session_id in self.rooms:
            # Create a copy of the set to avoid "Set size changed during iteration" errors
            for connection in list(self.rooms[session_id]):
                if connection != exclude:
                    try:
                        await connection.send_text(message)
                    except Exception:
                        # Auto-cleanup broken connections
                        self.disconnect(session_id, connection)

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
            await manager.broadcast_to_room(session_id, data, exclude=websocket)
    except WebSocketDisconnect:
        manager.disconnect(session_id, websocket)


@router.websocket("/ai-voice/{session_id}")
async def ai_voice_session(websocket: WebSocket, session_id: str):
    """
    AI Voice conversation powered by the real Consultant Engine.
    Flow: Greeting -> Listen for user text -> Consultant Engine -> Respond -> Loop
    """
    from innertone.services.consultant import get_consultant_response
    from innertone.core.database import AsyncSessionLocal

    await websocket.accept()
    logger.info(f"AI Voice session started for {session_id}")

    # Maintain conversation history for this voice session
    conversation_history = []

    try:
        await asyncio.sleep(0.3)

        # --- GREETING ---
        greeting = "Hello! I'm InnerTone, your compassionate wellness consultant. I'm here to listen and support you — no judgement, just care. Tell me, what's been on your mind lately?"
        await websocket.send_json({
            "type": "control",
            "state": "speaking",
            "transcript": greeting
        })
        # Add greeting to history
        conversation_history.append({"role": "model", "parts": [{"text": greeting}]})
        await asyncio.sleep(2)

        # --- MAIN CONVERSATION LOOP ---
        while True:
            # LISTENING: wait for user input (text message from frontend)
            await websocket.send_json({
                "type": "control",
                "state": "listening"
            })

            data = await websocket.receive_text()
            payload = json.loads(data)
            user_text = payload.get("text", "").strip()

            if not user_text:
                continue  # Ignore empty messages

            # Add user message to history
            conversation_history.append({"role": "user", "parts": [{"text": user_text}]})

            # THINKING: show the user we're processing
            await websocket.send_json({
                "type": "control",
                "state": "thinking"
            })

            # Call the real Consultant Engine
            try:
                async with AsyncSessionLocal() as db:
                    result = await get_consultant_response(
                        user_message=user_text,
                        conversation_history=conversation_history,
                        db=db,
                    )
                ai_response = result["response"]
            except Exception as e:
                logger.error(f"Consultant engine error: {e}")
                ai_response = "I'm sorry, I'm having a moment of reflection. Could you share that thought with me again?"

            # Add AI response to history
            conversation_history.append({"role": "model", "parts": [{"text": ai_response}]})

            # SPEAKING: deliver the response
            is_crisis = False
            try:
                is_crisis = result.get("is_crisis", False)
            except Exception:
                pass

            await websocket.send_json({
                "type": "audio",
                "state": "speaking",
                "transcript": ai_response,
                "is_crisis": is_crisis
            })
            # Wait proportionally to response length so TTS can finish
            word_count = len(ai_response.split())
            speak_time = max(4, word_count * 0.4)  # ~0.4s per word, minimum 4s
            await asyncio.sleep(speak_time)

    except WebSocketDisconnect:
        logger.info(f"AI Voice session {session_id} disconnected")
