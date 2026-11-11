import React, { useState, useEffect } from 'react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const HOURS = [
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
];

const Timetable = ({ locations, onNavigate }) => {
  const [classes, setClasses] = useState(() => {
    const saved = localStorage.getItem('npui_timetable');
    return saved ? JSON.parse(saved) : [];
  });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    subject: '',
    day: 'Monday',
    startTime: '08:00',
    endTime: '09:00',
    locationId: '',
    lecturer: '',
  });

  const [nextClass, setNextClass] = useState(null);

  // Save to localStorage whenever classes change
  useEffect(() => {
    localStorage.setItem('npui_timetable', JSON.stringify(classes));
  }, [classes]);

  // Find next upcoming class
  useEffect(() => {
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
    const currentTime = now.toTimeString().slice(0, 5);

    // Find classes today that haven't started yet
    const todayClasses = classes
      .filter(c => c.day === currentDay && c.startTime > currentTime)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    if (todayClasses.length > 0) {
      const next = todayClasses[0];
      const loc = locations.find(l => l.id === parseInt(next.locationId));
      setNextClass({ ...next, location: loc });
    } else {
      setNextClass(null);
    }
  }, [classes, locations]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAdd = () => {
    if (!form.subject || !form.locationId) return;
    const newClass = { ...form, id: Date.now() };
    setClasses([...classes, newClass]);
    setForm({
      subject: '', day: 'Monday', startTime: '08:00',
      endTime: '09:00', locationId: '', lecturer: ''
    });
    setShowForm(false);
  };

  const handleDelete = (id) => {
    setClasses(classes.filter(c => c.id !== id));
  };

  const getLocationName = (locationId) => {
    const loc = locations.find(l => l.id === parseInt(locationId));
    return loc ? loc.name : 'Unknown';
  };

  const getClassesForDay = (day) => {
    return classes
      .filter(c => c.day === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  return (
    <div style={styles.container}>

      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>📅 My Timetable</h2>
        <button style={styles.addBtn} onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '+ Add Class'}
        </button>
      </div>

      {/* Next Class Banner */}
      {nextClass && (
        <div style={styles.nextClassBanner}>
          <div style={styles.nextClassInfo}>
            <p style={styles.nextClassLabel}>⏰ Next Class</p>
            <p style={styles.nextClassName}>{nextClass.subject}</p>
            <p style={styles.nextClassDetails}>
              {nextClass.startTime} – {nextClass.endTime} · {nextClass.location?.name || 'Unknown location'}
            </p>
          </div>
          {nextClass.location && (
            <button
              style={styles.navigateBtn}
              onClick={() => onNavigate(nextClass.location)}
            >
              🗺️ Navigate Now
            </button>
          )}
        </div>
      )}

      {/* Add Class Form */}
      {showForm && (
        <div style={styles.formCard}>
          <h3 style={styles.formTitle}>Add New Class</h3>
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Subject / Course</label>
              <input
                style={styles.input}
                name="subject"
                placeholder="e.g. Software Engineering"
                value={form.subject}
                onChange={handleChange}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Lecturer</label>
              <input
                style={styles.input}
                name="lecturer"
                placeholder="e.g. Dr. Fon"
                value={form.lecturer}
                onChange={handleChange}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Day</label>
              <select style={styles.input} name="day" value={form.day} onChange={handleChange}>
                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Location</label>
              <select style={styles.input} name="locationId" value={form.locationId} onChange={handleChange}>
                <option value="">Select building...</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Start Time</label>
              <select style={styles.input} name="startTime" value={form.startTime} onChange={handleChange}>
                {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>End Time</label>
              <select style={styles.input} name="endTime" value={form.endTime} onChange={handleChange}>
                {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>
          <button style={styles.saveBtn} onClick={handleAdd}>Save Class</button>
        </div>
      )}

      {/* Timetable Grid */}
      <div style={styles.grid}>
        {DAYS.map(day => (
          <div key={day} style={styles.dayColumn}>
            <div style={styles.dayHeader}>{day}</div>
            {getClassesForDay(day).length === 0 ? (
              <div style={styles.emptyDay}>No classes</div>
            ) : (
              getClassesForDay(day).map(cls => (
                <div key={cls.id} style={styles.classCard}>
                  <div style={styles.classTime}>{cls.startTime} – {cls.endTime}</div>
                  <div style={styles.classSubject}>{cls.subject}</div>
                  {cls.lecturer && (
                    <div style={styles.classLecturer}>👤 {cls.lecturer}</div>
                  )}
                  <div style={styles.classLocation}>
                    📍 {getLocationName(cls.locationId)}
                  </div>
                  <div style={styles.classActions}>
                    <button
                      style={styles.navSmallBtn}
                      onClick={() => {
                        const loc = locations.find(l => l.id === parseInt(cls.locationId));
                        if (loc) onNavigate(loc);
                      }}
                    >
                      🗺️ Navigate
                    </button>
                    <button
                      style={styles.deleteBtn}
                      onClick={() => handleDelete(cls.id)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const styles = {
  container: { padding: '20px', overflowY: 'auto', height: 'calc(100vh - 50px)', backgroundColor: '#f0f4f8' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  title: { color: '#1A3A6B', margin: 0 },
  addBtn: { padding: '10px 20px', backgroundColor: '#1A3A6B', color: '#fff',
    border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  nextClassBanner: { backgroundColor: '#1A3A6B', color: '#fff', borderRadius: '12px',
    padding: '16px 20px', marginBottom: '20px', display: 'flex',
    justifyContent: 'space-between', alignItems: 'center' },
  nextClassInfo: { flex: 1 },
  nextClassLabel: { margin: '0 0 4px 0', fontSize: '12px', color: '#8CA8D0' },
  nextClassName: { margin: '0 0 4px 0', fontSize: '18px', fontWeight: 'bold' },
  nextClassDetails: { margin: 0, fontSize: '13px', color: '#c0d0e8' },
  navigateBtn: { padding: '10px 18px', backgroundColor: '#fff', color: '#1A3A6B',
    border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold',
    fontSize: '13px', whiteSpace: 'nowrap', marginLeft: '16px' },
  formCard: { backgroundColor: '#fff', borderRadius: '12px', padding: '20px',
    marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  formTitle: { color: '#1A3A6B', marginTop: 0, marginBottom: '16px' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' },
  formGroup: { display: 'flex', flexDirection: 'column' },
  label: { fontSize: '12px', color: '#555', marginBottom: '4px', fontWeight: 'bold' },
  input: { padding: '8px 10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px' },
  saveBtn: { padding: '10px 24px', backgroundColor: '#1A3A6B', color: '#fff',
    border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' },
  dayColumn: { backgroundColor: '#fff', borderRadius: '10px', overflow: 'hidden',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  dayHeader: { backgroundColor: '#1A3A6B', color: '#fff', padding: '10px',
    textAlign: 'center', fontWeight: 'bold', fontSize: '13px' },
  emptyDay: { padding: '20px', textAlign: 'center', color: '#bbb', fontSize: '12px' },
  classCard: { padding: '10px', borderBottom: '1px solid #f0f0f0' },
  classTime: { fontSize: '11px', color: '#8CA8D0', fontWeight: 'bold', marginBottom: '3px' },
  classSubject: { fontSize: '13px', fontWeight: 'bold', color: '#1A3A6B', marginBottom: '3px' },
  classLecturer: { fontSize: '11px', color: '#666', marginBottom: '3px' },
  classLocation: { fontSize: '11px', color: '#888', marginBottom: '8px' },
  classActions: { display: 'flex', gap: '6px' },
  navSmallBtn: { flex: 1, padding: '4px', backgroundColor: '#f0f4ff', color: '#1A3A6B',
    border: '1px solid #d0d8f0', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' },
  deleteBtn: { padding: '4px 8px', backgroundColor: '#fff0f0', color: '#ff4444',
    border: '1px solid #ffd0d0', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' },
};

export default Timetable;