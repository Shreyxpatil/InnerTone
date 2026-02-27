import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Phone, Video, Mic, MicOff, VideoOff, X, Sparkles, Radio, Timer, Star } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { Avatar3D } from '../components/Avatar3D';

const VideoCallPage = () => {
    const [status, setStatus] = useState('Idle');
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);

    // Timer State
    const [duration, setDuration] = useState(0);
    const timerRef = useRef(null);

    // WebRTC & Media
    const localVideoRef = useRef(null);
    const localStream = useRef(null);
    const [sessionId] = useState('video-' + Math.floor(Math.random() * 1000));

    // Audio Visualizer
    const canvasRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const animationFrameRef = useRef(null);

    // AI Voice State
    const [aiTranscript, setAiTranscript] = useState('');
    const [aiState, setAiState] = useState('idle');
    const aiWs = useRef(null);

    // Feedback Modal State
    const [showFeedback, setShowFeedback] = useState(false);
    const [feedbackRating, setFeedbackRating] = useState(0);
    const [feedbackHover, setFeedbackHover] = useState(0);
    const [feedbackMessage, setFeedbackMessage] = useState('');

    const endCallWithFeedback = () => {
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

    const skipFeedback = () => { resetSession(); };

    // Timer
    useEffect(() => {
        if (status !== 'Idle' && status !== 'Permission Denied') {
            timerRef.current = setInterval(() => setDuration(prev => prev + 1), 1000);
        } else {
            clearInterval(timerRef.current);
            if (status === 'Idle') setDuration(0);
        }
        return () => clearInterval(timerRef.current);
    }, [status]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // TTS
    const ttsResumeInterval = useRef(null);
    const speakText = (text) => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        if (ttsResumeInterval.current) clearInterval(ttsResumeInterval.current);
        ttsResumeInterval.current = setInterval(() => {
            if (window.speechSynthesis.speaking) window.speechSynthesis.resume();
            else clearInterval(ttsResumeInterval.current);
        }, 5000);
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Female')) || voices[0];
        let index = 0;
        const speakNext = () => {
            if (index >= sentences.length) { clearInterval(ttsResumeInterval.current); return; }
            const sentence = sentences[index].trim();
            if (!sentence) { index++; speakNext(); return; }
            const utterance = new SpeechSynthesisUtterance(sentence);
            utterance.rate = 0.95; utterance.pitch = 1.1;
            if (preferredVoice) utterance.voice = preferredVoice;
            utterance.onend = () => { index++; speakNext(); };
            utterance.onerror = () => { index++; speakNext(); };
            window.speechSynthesis.speak(utterance);
        };
        speakNext();
    };

    // Audio Visualizer
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
            let x = 0;
            for (let i = 0; i < bufferLength; i++) {
                const barHeight = dataArray[i] / 2;
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

    // Start the video call session with AI
    const startVideoCall = async () => {
        setStatus('AI Session Connecting...');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localStream.current = stream;
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;
            initVisualizer(stream);

            const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
            aiWs.current = new WebSocket(`${protocol}://${window.location.hostname}:8000/api/v1/calls/ai-voice/${sessionId}`);

            aiWs.current.onmessage = (event) => {
                const data = JSON.parse(event.data);
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
            aiWs.current.onclose = () => { setStatus('AI Disconnected'); setAiState('idle'); };
        } catch (err) {
            console.error(err);
            alert('Camera or Microphone access denied.');
            setStatus('Permission Denied');
        }
    };

    // Speech Recognition
    const recognitionRef = useRef(null);
    const [isRecording, setIsRecording] = useState(false);
    const [userSpeechText, setUserSpeechText] = useState('');
    const speechTextRef = useRef('');

    const startListeningMic = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) { alert('Speech Recognition not supported. Use Chrome.'); return; }
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US'; recognition.interimResults = true; recognition.continuous = false;
        recognitionRef.current = recognition;
        speechTextRef.current = '';
        recognition.onstart = () => { setIsRecording(true); setUserSpeechText(''); };
        recognition.onresult = (event) => {
            let transcript = '';
            for (let i = 0; i < event.results.length; i++) transcript += event.results[i][0].transcript;
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
            console.error('Speech Recognition Error:', event.error);
            setIsRecording(false);
        };
        recognition.start();
    };

    const stopListeningMic = () => { if (recognitionRef.current) recognitionRef.current.stop(); };

    // Cleanup
    useEffect(() => {
        return () => {
            aiWs.current?.close();
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
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '2rem', marginBottom: '8px' }}>Video <span className="accent-gradient">Call</span></h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            padding: '4px 12px', background: 'rgba(59, 130, 246, 0.1)',
                            borderRadius: 'var(--radius-full)', fontSize: '0.85rem', color: 'var(--accent-blue)'
                        }}>
                            <Radio size={14} className={status !== 'Idle' ? 'pulse' : ''} />
                            {status}
                        </span>
                        {status !== 'Idle' && (
                            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                <Timer size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                {formatTime(duration)}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Split-Screen Video Call Layout */}
            <div style={{
                flex: 1, display: 'flex', height: 'calc(100vh - 200px)', minHeight: '400px', maxHeight: '800px',
                background: '#000', borderRadius: 'var(--radius-lg)',
                overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)'
            }}>
                {/* Left Pane: AI Consultant Avatar */}
                <div style={{
                    flex: 1, position: 'relative', overflow: 'hidden',
                    background: 'black', borderRight: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center'
                }}>
                    <div style={{
                        position: 'relative', width: '100%', height: '100%', zIndex: 1,
                        boxShadow: aiState === 'speaking' ? 'inset 0 0 60px rgba(118,75,162,0.6)' : 'none',
                        transition: 'box-shadow 0.5s ease',
                    }}>
                        {/* Background Image */}
                        <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
                            <img src="/vc_bg.png" alt="background" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        {/* 3D WebGL Avatar Canvas */}
                        <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
                            <Canvas camera={{ position: [0, 0.55, 2.2], fov: 28 }} gl={{ alpha: true }} style={{ background: 'transparent' }}>
                                <ambientLight intensity={1.8} />
                                <directionalLight position={[2, 5, 5]} intensity={2} />
                                <directionalLight position={[-2, 3, 3]} intensity={0.8} />
                                <Suspense fallback={null}>
                                    <Avatar3D aiState={aiState} />
                                </Suspense>
                            </Canvas>
                        </div>

                        {/* Speaking indicator */}
                        {aiState === 'speaking' && (
                            <div style={{ position: 'absolute', inset: '0px', border: '3px solid rgba(118,75,162,0.4)', animation: 'sonar 2s infinite', pointerEvents: 'none' }} />
                        )}
                    </div>

                    {/* Floating Name Badge */}
                    <div style={{ position: 'absolute', bottom: '16px', left: '16px', background: 'rgba(0,0,0,0.6)', padding: '6px 14px', borderRadius: 'var(--radius-sm)', backdropFilter: 'blur(4px)', zIndex: 20 }}>
                        <h3 style={{ fontSize: '1rem', color: 'white', margin: 0 }}>Dr. Ananya Sharma</h3>
                        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
                            {aiState === 'speaking' ? '🔊 Speaking...' : aiState === 'thinking' ? '💭 Thinking...' : '👂 Listening...'}
                        </p>
                    </div>

                    {/* Live Captions Overlay */}
                    {aiTranscript && (aiState === 'speaking' || aiState === 'listening') && (
                        <div style={{
                            position: 'absolute', top: '16px', left: '16px', right: '16px', zIndex: 20,
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

                    <div style={{ position: 'absolute', bottom: '16px', left: '16px', background: 'rgba(0,0,0,0.6)', padding: '6px 14px', borderRadius: 'var(--radius-sm)', backdropFilter: 'blur(4px)' }}>
                        <h3 style={{ fontSize: '1rem', color: 'white', margin: 0 }}>You</h3>
                    </div>

                    {/* Start Overlay */}
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
                                        width: '50px', height: '50px', borderRadius: '50%', padding: 0,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
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

            {/* Controls Overlay */}
            <div className="glass-panel" style={{
                margin: '0 auto', padding: '12px 28px', display: 'flex', gap: '12px', alignItems: 'center',
                position: 'fixed', bottom: '30px', left: 'calc(50% + 140px)', transform: 'translateX(-50%)',
                zIndex: 1000, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)'
            }}>
                <button className="btn btn-ghost" onClick={toggleMute} style={{ borderRadius: '50%', width: '50px', height: '50px', padding: 0 }}>
                    {isMuted ? <MicOff color="var(--emotion-stressed)" /> : <Mic />}
                </button>
                <button className="btn btn-ghost" onClick={toggleVideo} style={{ borderRadius: '50%', width: '50px', height: '50px', padding: 0 }}>
                    {isVideoOff ? <VideoOff color="var(--emotion-stressed)" /> : <Video />}
                </button>
                <button className="btn" style={{ background: 'var(--emotion-stressed)', color: 'white', borderRadius: '50%', width: '50px', height: '50px', padding: 0 }} onClick={endCallWithFeedback}>
                    <X />
                </button>
                <div style={{ width: '1px', height: '24px', background: 'var(--glass-border)', margin: '0 8px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>SESSION</span>
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
                        boxShadow: '0 24px 80px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)',
                    }}>
                        <Sparkles size={40} color="var(--accent-purple)" style={{ marginBottom: '16px' }} />
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Session Complete</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.95rem' }}>
                            How was your experience?
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button key={star} onClick={() => setFeedbackRating(star)}
                                    onMouseEnter={() => setFeedbackHover(star)} onMouseLeave={() => setFeedbackHover(0)}
                                    style={{
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        transform: (feedbackHover || feedbackRating) >= star ? 'scale(1.2)' : 'scale(1)',
                                        transition: 'transform 0.15s ease',
                                    }}>
                                    <Star size={36}
                                        fill={(feedbackHover || feedbackRating) >= star ? '#f59e0b' : 'transparent'}
                                        color={(feedbackHover || feedbackRating) >= star ? '#f59e0b' : 'var(--text-secondary)'}
                                    />
                                </button>
                            ))}
                        </div>
                        <textarea value={feedbackMessage} onChange={(e) => setFeedbackMessage(e.target.value)}
                            placeholder="Any thoughts you'd like to share? (optional)" rows={3}
                            style={{
                                width: '100%', padding: '14px', fontSize: '0.95rem', borderRadius: 'var(--radius-md)',
                                border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)',
                                color: 'var(--text-primary)', resize: 'vertical', outline: 'none', marginBottom: '24px', fontFamily: 'inherit',
                            }}
                        />
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button className="btn btn-ghost" onClick={skipFeedback} style={{ padding: '12px 24px' }}>Skip</button>
                            <button className="btn btn-primary" onClick={submitFeedback}
                                disabled={feedbackRating === 0} style={{ padding: '12px 32px', opacity: feedbackRating ? 1 : 0.5 }}>
                                Submit Feedback
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes sonar { 0% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(1.5); opacity: 0; } }
                .pulse { animation: pulse-red 2s infinite; }
                @keyframes pulse-red { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }
                @keyframes thinking-pulse { 0% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.05); opacity: 1; } 100% { transform: scale(1); opacity: 0.8; } }
                @keyframes slide-down { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}</style>
        </div>
    );
};

export default VideoCallPage;
