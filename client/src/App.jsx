import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { getMe } from './services/api';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Attendance from './pages/Attendance';
import Reports from './pages/Reports';
import { LayoutDashboard, Users, Camera, FileSpreadsheet, LogOut, Key, Menu, X, Loader } from 'lucide-react';

const Sidebar = ({ user, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isMainAdmin = user?.role === 'admin';

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    ...(isMainAdmin ? [{ name: 'Enrollment', path: '/students', icon: Users }] : []),
    { name: 'Scan Camera', path: '/attendance', icon: Camera },
    { name: 'Reports', path: '/reports', icon: FileSpreadsheet },
  ];

  const handleNavClick = (path) => {
    setMobileOpen(false);
    navigate(path);
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="lg:hidden fixed top-4 left-4 z-40">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-3 bg-slate-900 border border-slate-800 text-white rounded-xl shadow-lg focus:outline-none cursor-pointer"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Container */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 glass-panel border-r border-slate-800/80 flex flex-col justify-between transform transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Upper Sidebar */}
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-10 pt-2 lg:pt-0">
            <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400">
              <Camera className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold leading-tight">
                <span className="text-white">Smart</span>
                <span className="text-yellow-500">Attend</span>
              </h2>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">AI Attendance</span>
            </div>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.name}
                  onClick={() => handleNavClick(item.path)}
                  className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-150 cursor-pointer text-left ${
                    isActive
                      ? 'bg-blue-600/10 border border-blue-500/35 text-blue-400 shadow-inner'
                      : 'border border-transparent text-slate-400 hover:text-white hover:bg-slate-900/50'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-white'}`} />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Lower Sidebar / Logout */}
        <div className="p-6 border-t border-slate-900">
          <div className="flex items-center justify-between p-3 bg-slate-900/40 rounded-xl border border-slate-850 mb-4">
            <div className="flex items-center space-x-3 truncate">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center font-bold text-blue-400 shrink-0 text-sm">
                {(user?.name || 'A')[0].toUpperCase()}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-white leading-none truncate">{user?.name || 'System Admin'}</p>
                <span className="text-[10px] text-slate-500 truncate">{user?.role === 'admin' ? 'Main Admin' : 'Teacher'}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-bold border border-transparent text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Overlay background when mobile menu is open */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-20 bg-slate-950/40 backdrop-blur-xs lg:hidden"
        ></div>
      )}
    </>
  );
};

const AppContent = ({ token, setToken, user, setUser }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    navigate('/login');
  };

  if (!token) {
    return (
      <Routes>
        <Route path="/login" element={<Login setToken={setToken} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  const isMainAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen flex">
      {/* Navigation sidebar */}
      <Sidebar user={user} onLogout={handleLogout} />

      {/* Main viewport */}
      <main className="flex-1 lg:pl-64 min-h-screen p-6 md:p-8 lg:p-10 pt-20 lg:pt-10 max-w-7xl mx-auto">
        <Routes>
          <Route path="/dashboard" element={<Dashboard user={user} />} />
          {isMainAdmin && <Route path="/students" element={<Students />} />}
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/reports" element={<Reports user={user} />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
};

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    // Validate local token session on initial mount or token change
    const checkTokenSession = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const userRes = await getMe();
          setToken(storedToken);
          setUser(userRes.data);
        } catch (err) {
          console.warn('Token expired or invalid. Clearing session.');
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setAppReady(true);
    };

    checkTokenSession();
  }, [token]);

  if (!appReady) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center">
        <Loader className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <Router>
      <AppContent token={token} setToken={setToken} user={user} setUser={setUser} />
    </Router>
  );
}

export default App;
