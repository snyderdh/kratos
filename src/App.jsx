import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Sidebar, { SIDEBAR_WIDTH } from './components/Sidebar';
import AuthGuard from './components/AuthGuard';
import Home from './pages/Home';
import RoutineGenerator from './pages/RoutineGenerator';
import ExerciseLibrary from './pages/ExerciseLibrary';
import SavedRoutines from './pages/SavedRoutines';
import CycleGenerator from './pages/CycleGenerator';
import SavedCycles from './pages/SavedCycles';
import Community from './pages/Community';
import Athletes from './pages/Athletes';
import Profile from './pages/Profile';
import Signup from './pages/Signup';
import Login from './pages/Login';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes — no sidebar */}
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />

          {/* Protected routes — with sidebar */}
          <Route
            path="/*"
            element={
              <AuthGuard>
                <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f6fa' }}>
                  <Sidebar />
                  <main
                    className="sidebar-main-content"
                    style={{ flex: 1, marginLeft: `${SIDEBAR_WIDTH}px`, minWidth: 0 }}
                  >
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/generate" element={<RoutineGenerator />} />
                      <Route path="/community" element={<Community />} />
                      <Route path="/athletes" element={<Athletes />} />
                      <Route path="/library" element={<ExerciseLibrary />} />
                      <Route path="/saved" element={<SavedRoutines />} />
                      <Route path="/cycle" element={<CycleGenerator />} />
                      <Route path="/saved-cycles" element={<SavedCycles />} />
                      <Route path="/profile" element={<Profile />} />
                    </Routes>
                  </main>
                </div>
              </AuthGuard>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
