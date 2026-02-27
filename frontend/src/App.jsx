import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Sparkles, MessageSquare, Calendar, Activity, Phone, Video } from 'lucide-react';
import ChatPage from './pages/ChatPage';
import DashboardPage from './pages/DashboardPage';
import BookingsPage from './pages/BookingsPage';
import VoiceCallPage from './pages/VoiceCallPage';
import VideoCallPage from './pages/VideoCallPage';

function Sidebar() {
    return (
        <aside className="sidebar">
            <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '48px', padding: '0 8px' }}>
                <div style={{ background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))', padding: '8px', borderRadius: '12px' }}>
                    <Sparkles size={24} color="white" />
                </div>
                <h1 style={{ fontSize: '1.5rem', m: 0 }}>Inner<span className="accent-gradient">Tone</span></h1>
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <NavLink to="/" className={({ isActive }) => `btn btn-ghost ${isActive ? 'active' : ''}`} style={{ justifyContent: 'flex-start', padding: '12px 16px' }}>
                    <Activity size={20} /> Dashboard
                </NavLink>
                <NavLink to="/chat" className={({ isActive }) => `btn btn-ghost ${isActive ? 'active' : ''}`} style={{ justifyContent: 'flex-start', padding: '12px 16px' }}>
                    <MessageSquare size={20} /> AI Consultant
                </NavLink>
                <NavLink to="/appointments" className={({ isActive }) => `btn btn-ghost ${isActive ? 'active' : ''}`} style={{ justifyContent: 'flex-start', padding: '12px 16px' }}>
                    <Calendar size={20} /> Appointments
                </NavLink>
                <NavLink to="/voice-call" className={({ isActive }) => `btn btn-ghost ${isActive ? 'active' : ''}`} style={{ justifyContent: 'flex-start', padding: '12px 16px' }}>
                    <Phone size={20} /> Voice Call
                </NavLink>
                <NavLink to="/video-call" className={({ isActive }) => `btn btn-ghost ${isActive ? 'active' : ''}`} style={{ justifyContent: 'flex-start', padding: '12px 16px' }}>
                    <Video size={20} /> Video Call
                </NavLink>
            </nav>

            <div style={{ marginTop: 'auto', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Your Session</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-teal), var(--accent-blue))' }} />
                    <div>
                        <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>Guest User</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--emotion-calm)' }}>● Online</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}

function App() {
    return (
        <BrowserRouter>
            <div className="app-container">
                <Sidebar />
                <main className="main-content">
                    <Routes>
                        <Route path="/" element={<DashboardPage />} />
                        <Route path="/chat" element={<ChatPage />} />
                        <Route path="/appointments" element={<BookingsPage />} />
                        <Route path="/voice-call" element={<VoiceCallPage />} />
                        <Route path="/video-call" element={<VideoCallPage />} />
                    </Routes>
                </main>
            </div>
        </BrowserRouter>
    );
}

export default App;
