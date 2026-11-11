import { getLocations } from './services/api';
import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import Navbar from './components/Navbar';
import Map from './components/Map';
import Timetable from './pages/Timetable';
import './App.css';

const App = () => {
  const [user, setUser] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [activePage, setActivePage] = useState('map');
  const [navigateTo, setNavigateTo] = useState(null);
  const [locations, setLocations] = useState([]);

 useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
    getLocations().then(res => setLocations(res.data)).catch(() => {});
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const handleNavigateFromTimetable = (location) => {
    setNavigateTo(location);
    setActivePage('map');
  };

  if (!user) {
    return showRegister
      ? <Register onSwitch={() => setShowRegister(false)} />
      : <Login onSwitch={() => setShowRegister(true)} />;
  }

  return (
    <div className="App">
      <Navbar
        user={user}
        onLogout={handleLogout}
        activePage={activePage}
        setActivePage={setActivePage}
      />
      {activePage === 'map'
        ? <Map navigateTo={navigateTo} clearNavigateTo={() => setNavigateTo(null)} />
        :  <Timetable
            locations={locations}
            onNavigate={handleNavigateFromTimetable}
          />
      }
    </div>
  );
};

export default App;