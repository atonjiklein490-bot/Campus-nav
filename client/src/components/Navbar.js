import React from 'react';

const Navbar = ({ user, onLogout, activePage, setActivePage }) => {
  return (
    <nav style={styles.nav}>
      <div style={styles.logo}>🏫 Campus Nav</div>
      <div style={styles.tabs}>
        <button
          style={{ ...styles.tab, ...(activePage === 'map' ? styles.activeTab : {}) }}
          onClick={() => setActivePage('map')}
        >
          🗺️ Map
        </button>
        <button
          style={{ ...styles.tab, ...(activePage === 'timetable' ? styles.activeTab : {}) }}
          onClick={() => setActivePage('timetable')}
        >
          📅 Timetable
        </button>
      </div>
      <div style={styles.right}>
        {user && (
          <>
            <span style={styles.welcome}>👋 {user.name}</span>
            <button style={styles.button} onClick={onLogout}>Logout</button>
          </>
        )}
      </div>
    </nav>
  );
};

const styles = {
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#1A3A6B', padding: '0 24px', color: '#fff', height: '50px' },
  logo: { fontSize: '18px', fontWeight: 'bold', letterSpacing: '1px' },
  tabs: { display: 'flex', gap: '4px' },
  tab: { padding: '8px 18px', backgroundColor: 'transparent', color: '#8CA8D0',
    border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px',
    borderRadius: '6px', transition: 'all 0.2s' },
  activeTab: { backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff' },
  right: { display: 'flex', alignItems: 'center', gap: '15px' },
  welcome: { fontSize: '14px', color: '#8CA8D0' },
  button: { padding: '6px 14px', backgroundColor: '#fff', color: '#1A3A6B',
    border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
};

export default Navbar;