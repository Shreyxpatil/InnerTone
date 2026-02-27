import React, { useState, useEffect, useRef } from 'react';
import { Phone, Mic, MicOff, X, Sparkles, Radio, Timer, Star } from 'lucide-react';

const VoiceCallPage = () => {
    const [status, setStatus] = useState('Idle');
    const [isMuted, setIsMuted] = useState(false);

    // Timer State
    const [duration, setDuration] = useState(0);
    const timerRef = useRef(null);

    // Audio refs
    const localStream = useRef(null);
    const canvasRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const animationFrameRef = useRef(null);

    // AI Voice State
    const [aiTranscript, setAiTranscript] = useState('');
    const [aiState, setAiState] = useState('idle');
    const aiWs = useRef(null);
    const [sessionId] = useState('voice-' + Math.floor(Math.random() * 1000));

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
        if (status === 'AI Listening' || status === 'AI Speaking' || status === 'InnerTone Thinking') {
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

    // AI Voice Session
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
            aiWs.current.onopen = () => console.log('AI WS Connected');
            aiWs.current.onerror = (err) => { console.error('AI WS Error:', err); setStatus('Connection Error'); };
            aiWs.current.onclose = () => { setStatus('AI Disconnected'); setAiState('idle'); };
        } catch (err) {
            console.error(err);
            alert('Microphone access denied. Please allow microphone permissions.');
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

    return (
        <div style={{ padding: '40px', paddingBottom: '140px', minHeight: '100%', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '2rem', marginBottom: '8px' }}>Voice <span className="accent-gradient">Call</span></h2>
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

            {/* Voice Session Area */}
            <div className="glass-panel" style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '40px 40px 100px 40px', minHeight: '500px', flex: 1,
                background: 'radial-gradient(circle at center, rgba(59, 130, 246, 0.1), transparent 70%)'
            }}>
                <div style={{
                    width: '160px', height: '160px', borderRadius: '50%',
                    background: aiState === 'speaking' ? '#8b5cf6' : aiState === 'listening' ? 'var(--accent-blue)' : 'var(--bg-secondary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: aiState === 'speaking' ? '0 0 80px rgba(139, 92, 246, 0.5)' : aiState === 'listening' ? '0 0 80px rgba(59, 130, 246, 0.5)' : 'none',
                    transition: 'var(--transition)', marginBottom: '32px', position: 'relative',
                    animation: aiState === 'thinking' ? 'thinking-pulse 2s infinite' : 'none'
                }}>
                    <Radio size={64} color={aiState === 'idle' ? 'var(--text-secondary)' : 'white'} />
                    {aiState === 'listening' && <div className="sonar-wave" />}
                </div>

                <div style={{ textAlign: 'center', maxWidth: '600px', width: '100%', position: 'relative' }}>
                    <canvas ref={canvasRef} width="400" height="80" style={{
                        width: '100%', height: '80px', marginBottom: '24px',
                        opacity: aiState === 'listening' ? 1 : 0.3, transition: '0.3s'
                    }} />

                    {aiState === 'speaking' && aiTranscript && (
                        <div className="captions-overlay">{aiTranscript}</div>
                    )}

                    <h3 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>
                        {aiState === 'speaking' ? 'InnerTone is Speaking...' :
                            aiState === 'thinking' ? 'InnerTone is Thinking...' :
                                aiState === 'listening' ? 'InnerTone is Listening...' : 'Start a Voice Call'}
                    </h3>
                    <div className="glass-panel" style={{
                        padding: '20px', minHeight: '100px', color: 'var(--text-secondary)',
                        marginBottom: '24px', fontStyle: 'italic', fontSize: '1rem',
                        opacity: aiState === 'speaking' ? 0.3 : 1, transition: '0.3s'
                    }}>
                        {aiTranscript || "The therapeutic conversation will appear here as we speak..."}
                    </div>
                </div>

                {status === 'Idle' && (
                    <button className="btn btn-primary" onClick={startAiVoiceSession} style={{ padding: '14px 32px', fontSize: '1.1rem' }}>
                        <Phone size={24} /> Start Voice Call
                    </button>
                )}
                {status !== 'Idle' && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        {userSpeechText && (
                            <div style={{
                                padding: '10px 20px', background: 'rgba(59, 130, 246, 0.15)',
                                border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: 'var(--radius-md)',
                                color: 'var(--text-primary)', fontSize: '0.95rem', maxWidth: '400px', textAlign: 'center',
                            }}>
                                🎤 "{userSpeechText}"
                            </div>
                        )}
                        <button
                            className={`btn ${isRecording ? 'btn-ghost' : 'btn-primary'}`}
                            onClick={isRecording ? stopListeningMic : startListeningMic}
                            disabled={aiState === 'thinking' || aiState === 'speaking'}
                            style={{
                                padding: '16px 32px', fontSize: '1.1rem', borderRadius: '999px',
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

            {/* Controls Overlay */}
            <div className="glass-panel" style={{
                margin: '0 auto', padding: '12px 28px', display: 'flex', gap: '12px', alignItems: 'center',
                position: 'fixed', bottom: '30px', left: 'calc(50% + 140px)', transform: 'translateX(-50%)',
                zIndex: 1000, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)'
            }}>
                <button className="btn btn-ghost" onClick={toggleMute} style={{ borderRadius: '50%', width: '50px', height: '50px', padding: 0 }}>
                    {isMuted ? <MicOff color="var(--emotion-stressed)" /> : <Mic />}
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
                            How was your experience with InnerTone?
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
                .sonar-wave { position: absolute; width: 100%; height: 100%; border-radius: 50%; background: var(--accent-blue); animation: sonar 2s infinite; z-index: -1; }
                .pulse { animation: pulse-red 2s infinite; }
                @keyframes sonar { 0% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(1.5); opacity: 0; } }
                @keyframes pulse-red { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }
                @keyframes thinking-pulse { 0% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.05); opacity: 1; } 100% { transform: scale(1); opacity: 0.8; } }
                .captions-overlay {
                    position: absolute; top: -20px; left: 50%; transform: translateX(-50%);
                    background: rgba(0,0,0,0.7); color: white; padding: 12px 24px;
                    border-radius: var(--radius-lg); font-size: 1.1rem; max-width: 90%; width: max-content;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);
                    animation: slide-up 0.3s ease-out; z-index: 50;
                }
                @keyframes slide-up { from { transform: translateX(-50%) translateY(10px); opacity: 0; } to { transform: translateX(-50%) translateY(0); opacity: 1; } }
            `}</style>
        </div>
    );
};

export default VoiceCallPage;
