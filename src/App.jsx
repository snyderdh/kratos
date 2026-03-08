import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ActiveWorkoutProvider } from './context/ActiveWorkoutContext';
import Sidebar, { SIDEBAR_WIDTH } from './components/Sidebar';
import BottomTabBar from './components/BottomTabBar';
import ActiveWorkoutBanner from './components/ActiveWorkoutBanner';
import AuthGuard from './components/AuthGuard';
import { C } from './theme';
import Home from './pages/Home';
import Community from './pages/Community';
import Profile from './pages/Profile';
import KratosSplit from './pages/KratosSplit';
import MyWorkout from './pages/MyWorkout';
import WorkoutLog from './pages/WorkoutLog';
import PublicRoutine from './pages/PublicRoutine';
import Signup from './pages/Signup';
import Login from './pages/Login';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ActiveWorkoutProvider>
        <Routes>
          {/* Public routes — no sidebar */}
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/routine/:id" element={<PublicRoutine />} />

          {/* Protected routes — with sidebar */}
          <Route
            path="/*"
            element={
              <AuthGuard>
                <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: C.bg }}>
                  <Sidebar />
                  <BottomTabBar />
                  <ActiveWorkoutBanner />
                  <main
                    className="sidebar-main-content"
                    style={{ flex: 1, marginLeft: `${SIDEBAR_WIDTH}px`, minWidth: 0 }}
                  >
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/train" element={<MyWorkout />} />
                      <Route path="/kratos" element={<KratosSplit />} />
                      <Route path="/community" element={<Community />} />
                      <Route path="/log" element={<WorkoutLog />} />
                      <Route path="/settings" element={<Profile />} />
                      {/* Legacy routes */}
                      <Route path="/workout" element={<MyWorkout />} />
                      <Route path="/kratos-split" element={<KratosSplit />} />
                      <Route path="/profile" element={<Profile />} />
                    </Routes>
                  </main>
                </div>
              </AuthGuard>
            }
          />
        </Routes>
        </ActiveWorkoutProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
