import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import AuthGuard from './components/AuthGuard';
import RoutineGenerator from './pages/RoutineGenerator';
import ExerciseLibrary from './pages/ExerciseLibrary';
import SavedRoutines from './pages/SavedRoutines';
import Community from './pages/Community';
import Athletes from './pages/Athletes';
import Signup from './pages/Signup';
import Login from './pages/Login';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes — no Navbar */}
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />

          {/* Protected routes — with Navbar */}
          <Route
            path="/*"
            element={
              <AuthGuard>
                <div style={{ minHeight: '100vh', backgroundColor: '#f5f6fa' }}>
                  <Navbar />
                  <main>
                    <Routes>
                      <Route path="/" element={<RoutineGenerator />} />
                      <Route path="/community" element={<Community />} />
                      <Route path="/athletes" element={<Athletes />} />
                      <Route path="/library" element={<ExerciseLibrary />} />
                      <Route path="/saved" element={<SavedRoutines />} />
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
