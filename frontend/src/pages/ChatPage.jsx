import { useState, useRef, useEffect } from 'react';
import { Send, AlertTriangle, Info } from 'lucide-react';

export default function ChatPage() {
    const [messages, setMessages] = useState([
        {
            role: 'model',
            content: "Hello. I'm the InnerTone AI Consultant. This is a safe space to talk about whatever is on your mind. How are you feeling today?",
            isCrisis: false,
            timestamp: new Date().toISOString()
        }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [sessionData, setSessionData] = useState({ emotions: ['neutral'], intensity: 'low' });
    const messagesEndRef = useRef(null);

    // Unique session ID for memory context
    const [sessionId] = useState(`web-session-${Math.random().toString(36).substr(2, 9)}`);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = { role: 'user', content: input, timestamp: new Date().toISOString() };
        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const res = await fetch('http://localhost:8000/api/v1/chat/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId, message: userMessage.content })
            });

            const data = await res.json();

            setMessages(prev => [...prev, {
                role: 'model',
                content: data.response,
                isCrisis: data.is_crisis,
                sources: data.sources || [],
                timestamp: new Date().toISOString()
            }]);

            // Update ambient emotion tracking (only if new emotions exist)
            if (data.emotions && data.emotions.length > 0) {
                setSessionData({ emotions: data.emotions, intensity: data.emotion_intensity });
            }

        } catch (error) {
            console.error("Chat error:", error);
            setMessages(prev => [...prev, {
                role: 'model',
                content: "Sorry, I'm having trouble connecting to the server right now. Please try again later.",
                timestamp: new Date().toISOString()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    // Determine ambient glow based on emotion
    let emotionColor = 'var(--text-secondary)';
    if (sessionData.emotions.includes('anxious') || sessionData.emotions.includes('stressed')) emotionColor = 'var(--emotion-anxious)';
    if (sessionData.emotions.includes('sad') || sessionData.emotions.includes('depressed')) emotionColor = 'var(--emotion-sad)';
    if (sessionData.emotions.includes('happy') || sessionData.emotions.includes('hopeful')) emotionColor = 'var(--emotion-calm)';

    const hasCrisis = messages.some(m => m.isCrisis);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>

            {/* Dynamic Header */}
            <header className="glass-panel" style={{
                margin: '24px 24px 0',
                padding: '16px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: `0 4px 30px ${emotionColor}22` // Dynamic glow
            }}>
                <div>
                    <h2 style={{ fontSize: '1.2rem', marginBottom: '4px' }}>AI CBT Consultant</h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                            display: 'inline-block',
                            width: 8, height: 8,
                            borderRadius: '50%',
                            background: emotionColor
                        }} />
                        Detected Mood: {sessionData.emotions.join(', ')} ({sessionData.intensity})
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-ghost" style={{ padding: '8px', borderRadius: '50%' }}>
                        <Info size={18} />
                    </button>
                </div>
            </header>

            {/* Messages Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {hasCrisis && (
                    <div className="glass-panel" style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        borderColor: 'var(--emotion-stressed)',
                        padding: '16px',
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'flex-start'
                    }}>
                        <AlertTriangle color="var(--emotion-stressed)" size={24} style={{ flexShrink: 0, marginTop: 2 }} />
                        <div>
                            <h3 style={{ color: 'var(--emotion-stressed)', marginBottom: 4 }}>Crisis Mode Active</h3>
                            <p style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>Our safety system has detected signs of severe distress. If you are in immediate danger, please contact emergency services immediately.</p>
                        </div>
                    </div>
                )}

                {messages.map((msg, idx) => {
                    const isUser = msg.role === 'user';
                    return (
                        <div key={idx} style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isUser ? 'flex-end' : 'flex-start',
                            maxWidth: '80%',
                            alignSelf: isUser ? 'flex-end' : 'flex-start'
                        }}>
                            <div
                                style={{
                                    padding: '12px 16px',
                                    borderRadius: '16px',
                                    background: isUser ? 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))' : 'var(--glass-bg)',
                                    border: isUser ? 'none' : '1px solid var(--glass-border)',
                                    color: isUser ? 'white' : 'var(--text-primary)',
                                    boxShadow: isUser ? '0 4px 15px rgba(59, 130, 246, 0.2)' : 'none',
                                    borderBottomRightRadius: isUser ? 4 : 16,
                                    borderBottomLeftRadius: !isUser ? 4 : 16,
                                    lineHeight: 1.6,
                                    fontSize: '0.95rem',
                                    wordBreak: 'break-word',
                                    whiteSpace: 'pre-wrap'
                                }}
                            >
                                {msg.content.split('\n').map((line, i) => (
                                    <span key={`${idx}-${i}`}>{line}<br /></span>
                                ))}
                            </div>

                            {msg.sources && msg.sources.length > 0 && (
                                <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                    <span style={{ opacity: 0.7 }}>RAG Sources:</span>
                                    {msg.sources.map((s, i) => (
                                        <span key={i} style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--glass-border)' }}>
                                            {s.book} ({s.section})
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}

                {isLoading && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '12px', opacity: 0.7 }}>
                        <div className="typing-dot" style={{ width: 6, height: 6, background: 'var(--text-secondary)', borderRadius: '50%', animation: 'pulse 1.5s infinite' }} />
                        <div className="typing-dot" style={{ width: 6, height: 6, background: 'var(--text-secondary)', borderRadius: '50%', animation: 'pulse 1.5s infinite 0.2s' }} />
                        <div className="typing-dot" style={{ width: 6, height: 6, background: 'var(--text-secondary)', borderRadius: '50%', animation: 'pulse 1.5s infinite 0.4s' }} />
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="glass-panel" style={{ margin: '0 24px 24px', padding: '16px' }}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '12px' }}>
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Type your message here..."
                        className="input-field"
                        disabled={isLoading}
                        style={{ border: 'none', background: 'rgba(255,255,255,0.05)' }}
                    />
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isLoading || !input.trim()}
                        style={{ padding: '0 20px', borderRadius: 'var(--radius-md)' }}
                    >
                        <Send size={18} />
                    </button>
                </form>
            </div>

        </div>
    );
}
