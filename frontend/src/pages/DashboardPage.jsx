import { Activity, Clock, ShieldCheck, Heart } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export default function DashboardPage() {
    return (
        <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>

            {/* Welcome Hero */}
            <div className="glass-panel" style={{
                padding: '48px',
                marginBottom: '40px',
                background: 'linear-gradient(135deg, rgba(30,41,59,0.9) 0%, rgba(15,23,42,0.95) 100%)',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{ position: 'relative', zIndex: 2 }}>
                    <h1 style={{ fontSize: '2.5rem', marginBottom: '16px' }}>
                        Good Afternoon, Guest.
                    </h1>
                    <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: '600px', lineHeight: 1.6, marginBottom: '32px' }}>
                        Take a deep breath. You're doing great. InnerTone is here to help you navigate your thoughts, track your wellness, and connect with professionals seamlessly.
                    </p>

                    <div style={{ display: 'flex', gap: '16px' }}>
                        <NavLink to="/chat" className="btn btn-primary">Start a Chat Session</NavLink>
                        <NavLink to="/appointments" className="btn btn-ghost">Schedule Therapy</NavLink>
                    </div>
                </div>

                {/* Abstract decoration */}
                <div style={{
                    position: 'absolute',
                    right: '-10%',
                    top: '-50%',
                    width: '500px',
                    height: '500px',
                    background: 'radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, transparent 70%)',
                    borderRadius: '50%',
                    zIndex: 1
                }} />
            </div>

            {/* Grid Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '40px' }}>

                <div className="glass-panel" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Current Mood</h3>
                        <Heart size={20} color="var(--emotion-calm)" />
                    </div>
                    <p style={{ fontSize: '1.8rem', fontWeight: 600 }}>Calm</p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--emotion-calm)', marginTop: '8px' }}>Improving trend</p>
                </div>

                <div className="glass-panel" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>AI Sessions</h3>
                        <Activity size={20} color="var(--accent-purple)" />
                    </div>
                    <p style={{ fontSize: '1.8rem', fontWeight: 600 }}>12</p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>This week</p>
                </div>

                <div className="glass-panel" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Next Appointment</h3>
                        <Clock size={20} color="var(--accent-blue)" />
                    </div>
                    <p style={{ fontSize: '1.4rem', fontWeight: 600 }}>Friday</p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>Dr. Sarah at 10:00 AM</p>
                </div>

                <div className="glass-panel" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Safety Status</h3>
                        <ShieldCheck size={20} color="var(--emotion-calm)" />
                    </div>
                    <p style={{ fontSize: '1.8rem', fontWeight: 600 }}>Secure</p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>End-to-end encrypted</p>
                </div>

            </div>

        </div>
    );
}
