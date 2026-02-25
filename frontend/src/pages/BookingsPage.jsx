import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, User, CheckCircle2, Trash2 } from 'lucide-react';

export default function BookingsPage() {
    const [appointments, setAppointments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitLoading, setSubmitLoading] = useState(false);
    const [formData, setFormData] = useState({
        therapist_name: 'Dr. Sarah (Clinical Psychologist)',
        date: '',
        time: '',
        notes: ''
    });

    // Mock user session
    const userId = 'web-user-demo';

    const fetchAppointments = async () => {
        try {
            const res = await fetch(`http://localhost:8000/api/v1/bookings/${userId}`);
            const data = await res.json();
            setAppointments(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAppointments();
    }, []);

    const handleBook = async (e) => {
        e.preventDefault();
        if (!formData.date || !formData.time) return;

        setSubmitLoading(true);
        try {
            // Combine date and time
            const scheduledAt = new Date(`${formData.date}T${formData.time}:00`).toISOString();

            await fetch('http://localhost:8000/api/v1/bookings/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    therapist_name: formData.therapist_name,
                    scheduled_at: scheduledAt,
                    notes: formData.notes
                })
            });

            // Reset form and refresh list
            setFormData({ ...formData, date: '', time: '', notes: '' });
            fetchAppointments();
        } catch (error) {
            console.error(error);
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleCancel = async (id) => {
        try {
            await fetch(`http://localhost:8000/api/v1/bookings/${id}`, { method: 'DELETE' });
            fetchAppointments(); // Refresh
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>

            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Appointments</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Schedule and manage your therapy sessions.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '32px', alignItems: 'start' }}>

                {/* List Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h2 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CalendarIcon size={20} className="text-secondary" />
                        Upcoming Sessions
                    </h2>

                    {isLoading ? (
                        <p style={{ color: 'var(--text-secondary)' }}>Loading appointments...</p>
                    ) : appointments.length === 0 ? (
                        <div className="glass-panel" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            <p>You have no appointments scheduled.</p>
                        </div>
                    ) : (
                        appointments.map(appt => (
                            <div key={appt.id} className="glass-panel" style={{
                                padding: '24px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                opacity: appt.status === 'cancelled' ? 0.5 : 1
                            }}>
                                <div>
                                    <h3 style={{ fontSize: '1.1rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <User size={18} /> {appt.therapist_name}
                                        {appt.status === 'cancelled' && <span style={{ fontSize: '0.75rem', background: 'var(--emotion-stressed)', padding: '2px 8px', borderRadius: 20 }}>Cancelled</span>}
                                    </h3>
                                    <p style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                                        <Clock size={16} />
                                        {new Date(appt.scheduled_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                    </p>
                                    {appt.notes && <p style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: 8 }}>"{appt.notes}"</p>}
                                </div>

                                {appt.status === 'scheduled' && (
                                    <button onClick={() => handleCancel(appt.id)} className="btn btn-ghost" style={{ color: 'var(--emotion-stressed)' }}>
                                        <Trash2 size={18} /> Cancel
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Booking Form Sidebar */}
                <div className="glass-panel" style={{ padding: '24px', position: 'sticky', top: '32px' }}>
                    <h2 style={{ fontSize: '1.2rem', marginBottom: '24px' }}>Book New Session</h2>

                    <form onSubmit={handleBook} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Therapist</label>
                            <select
                                className="input-field"
                                value={formData.therapist_name}
                                onChange={e => setFormData({ ...formData, therapist_name: e.target.value })}
                            >
                                <option>Dr. Sarah (Clinical Psychologist)</option>
                                <option>Dr. Michael (Performance Coach)</option>
                                <option>Dr. Elena (Grief Counselor)</option>
                            </select>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Date</label>
                                <input type="date" required className="input-field" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Time</label>
                                <input type="time" required className="input-field" value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Notes (Optional)</label>
                            <textarea
                                className="input-field"
                                rows="3"
                                placeholder="What would you like to discuss?"
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            ></textarea>
                        </div>

                        <button type="submit" disabled={isSubmitLoading} className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }}>
                            {isSubmitLoading ? 'Booking...' : 'Confirm Appointment'}
                        </button>

                    </form>
                </div>

            </div>
        </div>
    );
}
