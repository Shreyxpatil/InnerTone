import React, { useState, useEffect, useRef } from 'react';
import { Phone, Video, Mic, MicOff, VideoOff, X, User, Sparkles, Radio, Timer, Star } from 'lucide-react';

const CallsPage = () => {
    const [mode, setMode] = useState('ai'); // 'ai' or 'p2p'
    const [status, setStatus] = useState('Idle');
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);

    // Timer State
    const [duration, setDuration] = useState(0);
    const timerRef = useRef(null);

    // WebRTC & Session State
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const [sessionId, setSessionId] = useState('room-' + Math.floor(Math.random() * 1000));
    const ws = useRef(null);
    const pc = useRef(null);
    const localStream = useRef(null);

    // Audio Visualizer State
    const canvasRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const animationFrameRef = useRef(null);

    // AI Voice State
    const [aiTranscript, setAiTranscript] = useState('');
    const [aiState, setAiState] = useState('idle'); // 'speaking', 'listening', 'thinking', 'idle'
    const aiWs = useRef(null);

    // Static layout coordinates for the new consultant-avatar2.png image
    // These coordinates map to the pupils and the center of the lips.
    const [avatarFaceCoords, setAvatarFaceCoords] = useState({
        leftEye: { left: 43.0, top: 22.2 },
        rightEye: { left: 51.0, top: 22.2 },
        mouth: { left: 46.50, top: 33.0 }
    });
    const avatarImageRef = useRef(null);

    // Feedback Modal State
    const [showFeedback, setShowFeedback] = useState(false);
    const [feedbackRating, setFeedbackRating] = useState(0);
    const [feedbackHover, setFeedbackHover] = useState(0);
    const [feedbackMessage, setFeedbackMessage] = useState('');

    const endCallWithFeedback = () => {
        // Close the WebSocket connection
        if (aiWs.current) aiWs.current.close();
        window.speechSynthesis?.cancel();
        setAiState('idle');
        setStatus('Idle');
        setShowFeedback(true);
    };

    const resetSession = () => {
        if (aiWs.current) aiWs.current.close();
        if (localStream.current) {
            localStream.current.getTracks().forEach(t => t.stop());
            localStream.current = null;
        }
        window.speechSynthesis?.cancel();
        setAiState('idle');
        setAiTranscript('');
        setStatus('Idle');
        setDuration(0);
        setShowFeedback(false);
        setFeedbackRating(0);
        setFeedbackHover(0);
        setFeedbackMessage('');
    };

    const submitFeedback = () => {
        console.log('Feedback submitted:', { rating: feedbackRating, message: feedbackMessage });
        resetSession();
    };

    const skipFeedback = () => {
        resetSession();
    };

    // ---------------------------------------------------------
    // Timer Logic
    // ---------------------------------------------------------
    useEffect(() => {
        if (status === 'On Call' || status === 'AI Listening') {
            timerRef.current = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);
        } else {
            clearInterval(timerRef.current);
            setDuration(0);
        }
        return () => clearInterval(timerRef.current);
    }, [status]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // ---------------------------------------------------------
    // Audio Visualizer (Wave) Logic
    // ---------------------------------------------------------
    const ttsResumeInterval = useRef(null);

    const speakText = (text) => {
        if (!window.speechSynthesis) return;

        // Cancel any ongoing speech and clear keepalive
        window.speechSynthesis.cancel();
        if (ttsResumeInterval.current) clearInterval(ttsResumeInterval.current);

        // Chrome bug workaround: periodically call resume() to prevent silent pause
        ttsResumeInterval.current = setInterval(() => {
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.resume();
            } else {
                clearInterval(ttsResumeInterval.current);
            }
        }, 5000);

        // Split into sentences to avoid Chrome's utterance length limit
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v =>
            v.name.includes('Google US English') || v.name.includes('Female')
        ) || voices[0];

        let index = 0;
        const speakNext = () => {
            if (index >= sentences.length) {
                // All done speaking
                clearInterval(ttsResumeInterval.current);
                return;
            }
            const sentence = sentences[index].trim();
            if (!sentence) { index++; speakNext(); return; }

            const utterance = new SpeechSynthesisUtterance(sentence);
            utterance.rate = 0.95;
            utterance.pitch = 1.1;
            if (preferredVoice) utterance.voice = preferredVoice;

            utterance.onend = () => { index++; speakNext(); };
            utterance.onerror = () => { index++; speakNext(); }; // Skip on error

            window.speechSynthesis.speak(utterance);
        };
        speakNext();
    };

    const initVisualizer = (stream) => {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        drawWave();
    };

    const drawWave = () => {
        if (!canvasRef.current || !analyserRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const analyser = analyserRef.current;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const render = () => {
            animationFrameRef.current = requestAnimationFrame(render);
            analyser.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const barWidth = (canvas.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                barHeight = (dataArray[i] / 2);

                // Create a nice gradient for the bars
                const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
                gradient.addColorStop(0, '#3b82f6');
                gradient.addColorStop(1, '#8b5cf6');

                ctx.fillStyle = gradient;
                ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

                x += barWidth + 2;
            }
        };
        render();
    };

    // ---------------------------------------------------------
    // P2P WebRTC Signaling Logic
    // ---------------------------------------------------------
    const startP2PCall = async () => {
        setStatus('Initializing...');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localStream.current = stream;
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;

            initVisualizer(stream);

            // Connect signaling
            const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
            ws.current = new WebSocket(`${protocol}://${window.location.hostname}:8000/api/v1/calls/signaling/${sessionId}`);

            ws.current.onmessage = async (event) => {
                const message = JSON.parse(event.data);
                if (message.offer) {
                    await handleOffer(message.offer);
                } else if (message.answer) {
                    await pc.current.setRemoteDescription(new RTCSessionDescription(message.answer));
                } else if (message.candidate) {
                    await pc.current.addIceCandidate(new RTCIceCandidate(message.candidate));
                }
            };

            createPeerConnection();
            stream.getTracks().forEach(track => pc.current.addTrack(track, stream));
            setStatus('Ready to Connect');
        } catch (err) {
            console.error(err);
            alert("Camera or Microphone access denied. Please check your browser settings and ensure you are using a secure context (https or localhost).");
            setStatus('Permission Denied');
        }
    };

    const startVideoCall = async () => {
        setStatus('AI Session Connecting...');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localStream.current = stream;
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;
            initVisualizer(stream);

            // Connect AI WebSocket (same as AI voice session)
            const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
            aiWs.current = new WebSocket(`${protocol}://${window.location.hostname}:8000/api/v1/calls/ai-voice/${sessionId}`);

            aiWs.current.onmessage = (event) => {
                const data = JSON.parse(event.data);
                console.log('Video AI WS Received:', data);
                if (data.state) {
                    setAiState(data.state);
                    if (data.state === 'listening') setStatus('AI Listening');
                    else if (data.state === 'speaking') setStatus('AI Speaking');
                    else if (data.state === 'thinking') setStatus('InnerTone Thinking');
                }
                if (data.transcript) {
                    setAiTranscript(data.transcript);
                    if (data.state === 'speaking') speakText(data.transcript);
                }
            };

            aiWs.current.onopen = () => console.log('Video AI WS Connected');
            aiWs.current.onerror = (err) => { console.error('Video AI WS Error:', err); setStatus('Connection Error'); };
            aiWs.current.onclose = () => { console.log('Video AI WS Closed'); setStatus('AI Disconnected'); setAiState('idle'); };
        } catch (err) {
            console.error(err);
            alert('Camera or Microphone access denied.');
            setStatus('Permission Denied');
        }
    };

    const createPeerConnection = () => {
        pc.current = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        pc.current.onicecandidate = (event) => {
            if (event.candidate) {
                ws.current.send(JSON.stringify({ candidate: event.candidate }));
            }
        };

        pc.current.ontrack = (event) => {
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
            setStatus('On Call');
        };
    };

    const handleOffer = async (offer) => {
        await pc.current.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.current.createAnswer();
        await pc.current.setLocalDescription(answer);
        ws.current.send(JSON.stringify({ answer }));
    };

    const initiateOffer = async () => {
        const offer = await pc.current.createOffer();
        await pc.current.setLocalDescription(offer);
        ws.current.send(JSON.stringify({ offer }));
        setStatus('Calling...');
    };

    // ---------------------------------------------------------
    // AI Voice Session Logic
    // ---------------------------------------------------------
    const startAiVoiceSession = async () => {
        setStatus('AI Session Connecting...');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            localStream.current = stream;
            initVisualizer(stream);

            const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
            aiWs.current = new WebSocket(`${protocol}://${window.location.hostname}:8000/api/v1/calls/ai-voice/${sessionId}`);

            aiWs.current.onmessage = (event) => {
                const data = JSON.parse(event.data);
                console.log("AI WS Received:", data);

                if (data.state) {
                    setAiState(data.state);
                    // Dynamically update status based on AI state
                    if (data.state === 'listening') setStatus('AI Listening');
                    else if (data.state === 'speaking') setStatus('AI Speaking');
                    else if (data.state === 'thinking') setStatus('InnerTone Thinking');
                }

                if (data.transcript) {
                    setAiTranscript(data.transcript);
                    if (data.state === 'speaking') {
                        speakText(data.transcript);
                    }
                }
            };

            aiWs.current.onopen = () => {
                console.log("AI WS Connected");
                // Don't set status to 'Idle' here, let the greeting handle it or keep 'Connecting' until first msg
            };

            aiWs.current.onerror = (err) => {
                console.error("AI WS Error:", err);
                setStatus('Connection Error');
            };

            aiWs.current.onclose = () => {
                console.log("AI WS Closed");
                setStatus('AI Disconnected');
                setAiState('idle');
            };
        } catch (err) {
            console.error(err);
            alert("Microphone access denied. Please allow microphone permissions and use a secure connection.");
            setStatus('Permission Denied');
        }
    };

    const recognitionRef = useRef(null);
    const [isRecording, setIsRecording] = useState(false);
    const [userSpeechText, setUserSpeechText] = useState('');
    const speechTextRef = useRef('');

    const startListeningMic = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Speech Recognition is not supported in this browser. Please use Chrome.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = true;
        recognition.continuous = false;
        recognitionRef.current = recognition;
        speechTextRef.current = '';

        recognition.onstart = () => {
            setIsRecording(true);
            setUserSpeechText('');
        };

        recognition.onresult = (event) => {
            let transcript = '';
            for (let i = 0; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }
            setUserSpeechText(transcript);
            speechTextRef.current = transcript;
        };

        recognition.onend = () => {
            setIsRecording(false);
            const finalText = speechTextRef.current;
            if (finalText.trim() && aiWs.current && aiWs.current.readyState === WebSocket.OPEN) {
                aiWs.current.send(JSON.stringify({ type: 'text', text: finalText.trim() }));
            }
            setUserSpeechText('');
            speechTextRef.current = '';
        };

        recognition.onerror = (event) => {
            console.error("Speech Recognition Error:", event.error);
            setIsRecording(false);
            if (event.error === 'not-allowed') {
                alert("Microphone access denied. Please allow microphone permissions.");
            }
        };

        recognition.start();
    };

    const stopListeningMic = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    };

    // ---------------------------------------------------------
    // Effects & Cleanup
    // ---------------------------------------------------------
    useEffect(() => {
        return () => {
            ws.current?.close();
            aiWs.current?.close();
            pc.current?.close();
            localStream.current?.getTracks().forEach(t => t.stop());
            cancelAnimationFrame(animationFrameRef.current);
            audioContextRef.current?.close();
        };
    }, []);

    const toggleMute = () => {
        if (localStream.current) {
            localStream.current.getAudioTracks()[0].enabled = isMuted;
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        if (localStream.current) {
            localStream.current.getVideoTracks()[0].enabled = isVideoOff;
            setIsVideoOff(!isVideoOff);
        }
    };

    return (
        <div style={{ padding: '40px', paddingBottom: '140px', minHeight: '100%', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Header & Mode Switcher */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <div>
                        <h2 style={{ fontSize: '2rem', marginBottom: '8px' }}>Voice & Video <span className="accent-gradient">Sessions</span></h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 12px',
                                background: 'rgba(59, 130, 246, 0.1)',
                                borderRadius: 'var(--radius-full)',
                                fontSize: '0.85rem',
                                color: 'var(--accent-blue)'
                            }}>
                                <Radio size={14} className={status === 'On Call' || status === 'AI Listening' ? 'pulse' : ''} />
                                {status}
                            </span>
                            {(status === 'On Call' || status === 'AI Listening') && (
                                <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    <Timer size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                    {formatTime(duration)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '4px', display: 'flex', gap: '4px' }}>
                    <button
                        onClick={() => {
                            if (aiWs.current) aiWs.current.close();
                            window.speechSynthesis?.cancel();
                            setAiState('idle'); setAiTranscript(''); setStatus('Idle');
                            setMode('ai');
                        }}
                        className={`btn ${mode === 'ai' ? 'btn-primary' : 'btn-ghost'}`}
                    >
                        <Sparkles size={18} /> AI Session
                    </button>
                    <button
                        onClick={() => {
                            if (aiWs.current) aiWs.current.close();
                            window.speechSynthesis?.cancel();
                            setAiState('idle'); setAiTranscript(''); setStatus('Idle');
                            setMode('p2p');
                        }}
                        className={`btn ${mode === 'p2p' ? 'btn-primary' : 'btn-ghost'}`}
                    >
                        <Video size={18} /> Therapist Call
                    </button>
                </div>
            </div>

            {/* Layout Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginTop: '16px', height: '100%', minHeight: 0 }}>

                {mode === 'p2p' ? (
                    <>
                        {/* Split-Screen Video Call Layout (Full Width) */}
                        {/* Use calc() to lock the height perfectly to the available viewport without scrolling */}
                        <div style={{
                            flex: 1, display: 'flex', height: 'calc(100vh - 200px)', minHeight: '400px', maxHeight: '800px',
                            background: '#000', borderRadius: 'var(--radius-lg)',
                            overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            {/* Left Pane: AI Consultant */}
                            <div style={{
                                flex: 1, position: 'relative', overflow: 'hidden',
                                background: 'black', borderRight: '1px solid rgba(255,255,255,0.1)',
                                display: 'flex', justifyContent: 'center', alignItems: 'center'
                            }}>
                                {/* Aspect-Ratio Locked Container */}
                                <div style={{
                                    position: 'relative', width: '100%', height: '100%',
                                    zIndex: 1,
                                    boxShadow: aiState === 'speaking' ? 'inset 0 0 60px rgba(118,75,162,0.6)' : 'none',
                                    transition: 'box-shadow 0.5s ease',
                                }}>
                                    {/* Un-cropped full pane image */}
                                    <img
                                        ref={avatarImageRef}
                                        src="/consultant-avatar2.png"
                                        alt="Dr. Ananya Sharma"
                                        style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain' }}
                                    />

                                    {/* SVG wrapper perfectly mimics objectFit="contain" bounds for absolute % mapping.
                                        This provides a permanent fix for coordinate drifting on window resize/zoom. */}
                                    <svg viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid meet" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
                                        <foreignObject x="0" y="0" width="1536" height="1024">
                                            <div style={{ position: 'relative', width: '100%', height: '100%', pointerEvents: 'auto' }}>
                                                {avatarFaceCoords && (
                                                    <>
                                                        <div className="eye-blink" style={{
                                                            position: 'absolute',
                                                            top: `${avatarFaceCoords.leftEye.top}%`,
                                                            left: `${avatarFaceCoords.leftEye.left}%`,
                                                            width: '4.5%', height: '2.5%',
                                                            borderRadius: '50% 50% 20% 20%',
                                                            background: 'linear-gradient(to bottom, #bd856c, #a06e5a)',
                                                            borderBottom: '2px solid #2a1914',
                                                            boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.3)',
                                                            opacity: 0,
                                                            animation: 'blink-anim 4s infinite',
                                                            transform: 'translate(-50%, -50%)', zIndex: 10
                                                        }} />

                                                        <div className="eye-blink" style={{
                                                            position: 'absolute',
                                                            top: `${avatarFaceCoords.rightEye.top}%`,
                                                            left: `${avatarFaceCoords.rightEye.left}%`,
                                                            width: '4.5%', height: '2.5%',
                                                            borderRadius: '50% 50% 20% 20%',
                                                            background: 'linear-gradient(to bottom, #bd856c, #a06e5a)',
                                                            borderBottom: '2px solid #2a1914',
                                                            boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.3)',
                                                            opacity: 0,
                                                            animation: 'blink-anim 4s 0.05s infinite',
                                                            transform: 'translate(-50%, -50%)', zIndex: 10
                                                        }} />

                                                        {aiState === 'speaking' && (
                                                            <div style={{
                                                                position: 'absolute',
                                                                top: `${avatarFaceCoords.mouth.top}%`,
                                                                left: `${avatarFaceCoords.mouth.left}%`,
                                                                width: '6.5%', height: '2.5%',
                                                                background: '#2b1013', /* Dark inner mouth */
                                                                borderTop: '2px solid rgba(232, 224, 224, 0.5)', /* Hint of upper teeth */
                                                                boxShadow: 'inset 0 4px 6px rgba(0,0,0,0.7)',
                                                                borderRadius: '40% 40% 60% 60%',
                                                                animation: 'mouth-talk-advanced 0.35s infinite alternate ease-in-out',
                                                                transformOrigin: 'top center',
                                                                transform: 'translate(-50%, -50%)', zIndex: 10
                                                            }} />
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </foreignObject>
                                    </svg>

                                    {/* Speaking indicator rings */}
                                    {aiState === 'speaking' && (
                                        <div style={{ position: 'absolute', inset: '0px', border: '3px solid rgba(118,75,162,0.4)', animation: 'sonar 2s infinite', pointerEvents: 'none' }} />
                                    )}
                                </div>

                                {/* Floating Name Badge */}
                                <div style={{ position: 'absolute', bottom: '16px', left: '16px', background: 'rgba(0,0,0,0.6)', padding: '6px 14px', borderRadius: 'var(--radius-sm)', backdropFilter: 'blur(4px)' }}>
                                    <h3 style={{ fontSize: '1rem', color: 'white', margin: 0 }}>Dr. Ananya Sharma</h3>
                                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
                                        {aiState === 'speaking' ? '🔊 Speaking...' : aiState === 'thinking' ? '💭 Thinking...' : '👂 Listening...'}
                                    </p>
                                </div>

                                {/* Live Captions Overlay */}
                                {aiTranscript && (aiState === 'speaking' || aiState === 'listening') && (
                                    <div style={{
                                        position: 'absolute', top: '16px', left: '16px', right: '16px',
                                        background: 'rgba(0,0,0,0.75)', color: 'white', padding: '12px 20px',
                                        borderRadius: 'var(--radius-md)', fontSize: '0.95rem',
                                        textAlign: 'center', animation: 'slide-down 0.3s ease-out', backdropFilter: 'blur(8px)'
                                    }}>
                                        {aiTranscript}
                                    </div>
                                )}
                            </div>

                            {/* Right Pane: User Camera */}
                            <div style={{
                                flex: 1, position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden',
                                background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)'
                            }}>
                                <video ref={localVideoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />

                                {/* Floating Name Badge */}
                                <div style={{ position: 'absolute', bottom: '16px', left: '16px', background: 'rgba(0,0,0,0.6)', padding: '6px 14px', borderRadius: 'var(--radius-sm)', backdropFilter: 'blur(4px)' }}>
                                    <h3 style={{ fontSize: '1rem', color: 'white', margin: 0 }}>You</h3>
                                </div>

                                {/* Start Overlay / Tap to Speak */}
                                {status === 'Idle' ? (
                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
                                        <button className="btn btn-primary" onClick={startVideoCall} style={{ padding: '14px 32px', fontSize: '1.1rem', borderRadius: '999px', boxShadow: '0 4px 12px rgba(59,130,246,0.4)' }}>
                                            <Video size={20} style={{ marginRight: '8px' }} /> Join Call
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ position: 'absolute', bottom: '24px', right: '24px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
                                        <canvas ref={canvasRef} width="120" height="40" style={{ width: '120px', height: '40px', zIndex: 10, background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius-sm)' }} />

                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            {userSpeechText && (
                                                <div style={{ padding: '6px 12px', background: 'rgba(0,0,0,0.6)', borderRadius: 'var(--radius-md)', color: 'white', fontSize: '0.85rem', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {userSpeechText}
                                                </div>
                                            )}
                                            <button
                                                className="btn"
                                                onClick={isRecording ? stopListeningMic : startListeningMic}
                                                disabled={aiState === 'thinking' || aiState === 'speaking'}
                                                style={{
                                                    width: '50px', height: '50px', borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    background: isRecording ? 'var(--emotion-stressed)' : 'rgba(255,255,255,0.2)',
                                                    border: isRecording ? 'none' : '1px solid rgba(255,255,255,0.4)',
                                                    color: 'white',
                                                    animation: isRecording ? 'thinking-pulse 1.5s infinite' : 'none',
                                                    backdropFilter: 'blur(4px)'
                                                }}
                                                title={isRecording ? 'Listening...' : 'Tap to Speak'}
                                            >
                                                <Mic size={22} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    /* AI Voice Session Area */
                    <div className="glass-panel" style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '40px 40px 100px 40px',
                        minHeight: '500px',
                        background: 'radial-gradient(circle at center, rgba(59, 130, 246, 0.1), transparent 70%)'
                    }}>
                        <div style={{
                            width: '160px',
                            height: '160px',
                            borderRadius: '50%',
                            background: aiState === 'speaking' ? '#8b5cf6' : aiState === 'listening' ? 'var(--accent-blue)' : 'var(--bg-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: aiState === 'speaking' ? '0 0 80px rgba(139, 92, 246, 0.5)' : aiState === 'listening' ? '0 0 80px rgba(59, 130, 246, 0.5)' : 'none',
                            transition: 'var(--transition)',
                            marginBottom: '32px',
                            position: 'relative',
                            animation: aiState === 'thinking' ? 'thinking-pulse 2s infinite' : 'none'
                        }}>
                            <Radio size={64} color={aiState === 'idle' ? 'var(--text-secondary)' : 'white'} />
                            {aiState === 'listening' && (
                                <div className="sonar-wave" />
                            )}
                        </div>

                        <div style={{ textAlign: 'center', maxWidth: '600px', width: '100%', position: 'relative' }}>
                            <canvas ref={canvasRef} width="400" height="80" style={{
                                width: '100%',
                                height: '80px',
                                marginBottom: '24px',
                                opacity: aiState === 'listening' ? 1 : 0.3,
                                transition: '0.3s'
                            }} />

                            {/* Live Captions Overlay */}
                            {aiState === 'speaking' && aiTranscript && (
                                <div className="captions-overlay">
                                    {aiTranscript}
                                </div>
                            )}

                            <h3 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>
                                {aiState === 'speaking' ? 'InnerTone is Speaking...' :
                                    aiState === 'thinking' ? 'InnerTone is Thinking...' :
                                        aiState === 'listening' ? 'InnerTone is Listening...' : 'Start an AI Voice Session'}
                            </h3>
                            <div className="glass-panel" style={{
                                padding: '20px',
                                minHeight: '100px',
                                color: 'var(--text-secondary)',
                                marginBottom: '24px',
                                fontStyle: 'italic',
                                fontSize: '1rem',
                                opacity: aiState === 'speaking' ? 0.3 : 1, // Dim the background transcript while captions are active
                                transition: '0.3s'
                            }}>
                                {aiTranscript || "The therapeutic conversation will appear here as we speak..."}
                            </div>
                        </div>

                        {status === 'Idle' && (
                            <button className="btn btn-primary" onClick={startAiVoiceSession} style={{ padding: '14px 32px', fontSize: '1.1rem' }}>
                                <Phone size={24} /> Start Voice Session
                            </button>
                        )}
                        {(status === 'AI Listening' || status === 'AI Session Connecting...' || status === 'AI Speaking' || status === 'InnerTone Thinking') && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                {userSpeechText && (
                                    <div style={{
                                        padding: '10px 20px',
                                        background: 'rgba(59, 130, 246, 0.15)',
                                        border: '1px solid rgba(59, 130, 246, 0.3)',
                                        borderRadius: 'var(--radius-md)',
                                        color: 'var(--text-primary)',
                                        fontSize: '0.95rem',
                                        maxWidth: '400px',
                                        textAlign: 'center',
                                    }}>
                                        🎤 "{userSpeechText}"
                                    </div>
                                )}
                                <button
                                    className={`btn ${isRecording ? 'btn-ghost' : 'btn-primary'}`}
                                    onClick={isRecording ? stopListeningMic : startListeningMic}
                                    disabled={aiState === 'thinking' || aiState === 'speaking'}
                                    style={{
                                        padding: '16px 32px',
                                        fontSize: '1.1rem',
                                        borderRadius: '999px',
                                        background: isRecording ? 'var(--emotion-stressed)' : undefined,
                                        border: isRecording ? '2px solid var(--emotion-stressed)' : undefined,
                                        animation: isRecording ? 'thinking-pulse 1.5s infinite' : 'none',
                                    }}
                                >
                                    <Mic size={22} /> {isRecording ? 'Listening... (tap to stop)' : 'Tap to Speak'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Controls Overlay */}
            <div className="glass-panel" style={{
                margin: '0 auto',
                padding: '12px 28px',
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                position: 'fixed',
                bottom: '30px',
                left: 'calc(50% + 140px)', // Offset for sidebar
                transform: 'translateX(-50%)',
                zIndex: 1000,
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.15)'
            }}>
                {mode === 'p2p' && status === 'Idle' && (
                    <button className="btn btn-primary" onClick={startP2PCall}>Initialize Devices</button>
                )}
                {mode === 'p2p' && status === 'Ready to Connect' && (
                    <button className="btn btn-primary" onClick={initiateOffer}>Call Therapist</button>
                )}

                <button className="btn btn-ghost" onClick={toggleMute} style={{ borderRadius: '50%', width: '50px', height: '50px', padding: 0 }}>
                    {isMuted ? <MicOff color="var(--emotion-stressed)" /> : <Mic />}
                </button>

                {mode === 'p2p' && (
                    <button className="btn btn-ghost" onClick={toggleVideo} style={{ borderRadius: '50%', width: '50px', height: '50px', padding: 0 }}>
                        {isVideoOff ? <VideoOff color="var(--emotion-stressed)" /> : <Video />}
                    </button>
                )}

                <button className="btn" style={{ background: 'var(--emotion-stressed)', color: 'white', borderRadius: '50%', width: '50px', height: '50px', padding: 0 }} onClick={endCallWithFeedback}>
                    <X />
                </button>

                <div style={{ width: '1px', height: '24px', background: 'var(--glass-border)', margin: '0 8px' }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>ROOM ID</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, fontFamily: 'monospace' }}>{sessionId}</span>
                </div>
            </div>

            {/* Feedback Modal */}
            {showFeedback && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 2000,
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: 'fadeIn 0.3s ease-out',
                }}>
                    <div className="glass-panel" style={{
                        padding: '40px', maxWidth: '440px', width: '90%',
                        textAlign: 'center', borderRadius: 'var(--radius-lg)',
                        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
                        border: '1px solid rgba(255,255,255,0.15)',
                    }}>
                        <Sparkles size={40} color="var(--accent-purple)" style={{ marginBottom: '16px' }} />
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Session Complete</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.95rem' }}>
                            How was your experience with InnerTone?
                        </p>

                        {/* Star Rating */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onClick={() => setFeedbackRating(star)}
                                    onMouseEnter={() => setFeedbackHover(star)}
                                    onMouseLeave={() => setFeedbackHover(0)}
                                    style={{
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        transform: (feedbackHover || feedbackRating) >= star ? 'scale(1.2)' : 'scale(1)',
                                        transition: 'transform 0.15s ease',
                                    }}
                                >
                                    <Star
                                        size={36}
                                        fill={(feedbackHover || feedbackRating) >= star ? '#f59e0b' : 'transparent'}
                                        color={(feedbackHover || feedbackRating) >= star ? '#f59e0b' : 'var(--text-secondary)'}
                                    />
                                </button>
                            ))}
                        </div>

                        {/* Optional Message */}
                        <textarea
                            value={feedbackMessage}
                            onChange={(e) => setFeedbackMessage(e.target.value)}
                            placeholder="Any thoughts you'd like to share? (optional)"
                            rows={3}
                            style={{
                                width: '100%', padding: '14px', fontSize: '0.95rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid rgba(255,255,255,0.15)',
                                background: 'rgba(255,255,255,0.05)',
                                color: 'var(--text-primary)', resize: 'vertical',
                                outline: 'none', marginBottom: '24px',
                                fontFamily: 'inherit',
                            }}
                        />

                        {/* Buttons */}
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button className="btn btn-ghost" onClick={skipFeedback} style={{ padding: '12px 24px' }}>
                                Skip
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={submitFeedback}
                                disabled={feedbackRating === 0}
                                style={{ padding: '12px 32px', opacity: feedbackRating ? 1 : 0.5 }}
                            >
                                Submit Feedback
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes sonar {
                    0% { transform: scale(1); opacity: 0.5; }
                    100% { transform: scale(1.5); opacity: 0; }
                }
                @keyframes avatar-breathe {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.03); }
                    100% { transform: scale(1); }
                }
                @keyframes avatar-speak {
                    0% { transform: scale(1); }
                    25% { transform: scale(1.04); }
                    50% { transform: scale(1.01); }
                    75% { transform: scale(1.05); }
                    100% { transform: scale(1); }
                }
                @keyframes blink-anim {
                    0%, 90%, 100% { opacity: 0; transform: translate(-50%, -50%) scaleY(0); }
                    93%, 97% { opacity: 1; transform: translate(-50%, -50%) scaleY(1); }
                }
                
                /* Advanced Lip Sync */
                @keyframes mouth-talk-advanced {
                    /* Base state - closed mouth / tiny gap */
                    0% { 
                        transform: translate(-50%, -50%) scale(0.8, 0.2); 
                        border-radius: 40% 40% 60% 60%;
                        opacity: 0.3;
                    }
                    /* mouth_wide + mild jaw_open */
                    25% { 
                        transform: translate(-50%, -50%) scale(1.1, 1.2); 
                        border-radius: 30% 30% 70% 70%;
                        opacity: 0.8;
                    }
                    /* mouth_open (oscillating) + jaw_open */
                    50% { 
                        transform: translate(-50%, -50%) scale(0.9, 2.2); 
                        border-radius: 45% 45% 55% 55%; 
                        opacity: 0.9;
                    }
                    /* lip_up + lip_down distinct shape */
                    75% { 
                        transform: translate(-50%, -50%) scale(1.2, 1.4); 
                        border-radius: 35% 35% 65% 65%;
                        opacity: 0.8;
                    }
                    /* Return to base/smile idle state */
                    100% { 
                        transform: translate(-50%, -50%) scale(0.9, 0.3); 
                        border-radius: 40% 40% 60% 60%;
                        opacity: 0.4;
                    }
                }
                .sonar-wave {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    background: var(--accent-blue);
                    animation: sonar 2s infinite;
                    z-index: -1;
                }
                .pulse {
                    animation: pulse-red 2s infinite;
                }
                @keyframes pulse-red {
                    0% { opacity: 1; }
                    50% { opacity: 0.3; }
                    100% { opacity: 1; }
                }
                @keyframes thinking-pulse {
                    0% { transform: scale(1); opacity: 0.8; }
                    50% { transform: scale(1.05); opacity: 1; }
                    100% { transform: scale(1); opacity: 0.8; }
                }
                .captions-overlay {
                    position: absolute;
                    top: -20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0, 0, 0, 0.7);
                    color: white;
                    padding: 12px 24px;
                    border-radius: var(--radius-lg);
                    font-size: 1.1rem;
                    max-width: 90%;
                    width: max-content;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                    border: 1px solid rgba(255,255,255,0.1);
                    animation: slide-up 0.3s ease-out;
                    z-index: 50;
                }
                @keyframes slide-up {
                    from { transform: translateX(-50%) translateY(10px); opacity: 0; }
                    to { transform: translateX(-50%) translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default CallsPage;
