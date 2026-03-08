import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ActiveWorkoutProvider } from './context/ActiveWorkoutContext';
import Sidebar, { SIDEBAR_WIDTH } from './components/Sidebar';
import BottomTabBar from './components/BottomTabBar';
import ActiveWorkoutBanner from './components/ActiveWorkoutBanner';
import AuthGuard from './components/AuthGuard';
import ErrorBoundary from './components/ErrorBoundary';
import { C } from './theme';
import Home from './pages/Home';
import Community from './pages/Community';
import Profile from './pages/Profile';
import KratosSplit from './pages/KratosSplit';
import MyWorkout from './pages/MyWorkout';
import BuildWorkout from './pages/BuildWorkout';
import MyRoutinesPage from './pages/MyRoutinesPage';
import RoutineGenerator from './pages/RoutineGenerator';
import WorkoutLog from './pages/WorkoutLog';
import ExerciseLibrary from './pages/ExerciseLibrary';
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
                    <ErrorBoundary>
                      <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/active" element={<MyWorkout />} />
                        <Route path="/build" element={<BuildWorkout />} />
                        <Route path="/generate" element={<RoutineGenerator />} />
                        <Route path="/routines" element={<MyRoutinesPage />} />
                        <Route path="/kratos" element={<KratosSplit />} />
                        <Route path="/community" element={<Community />} />
                        <Route path="/log" element={<WorkoutLog />} />
                        <Route path="/library" element={<ExerciseLibrary />} />
                        <Route path="/settings" element={<Profile />} />
                        {/* Legacy redirects */}
                        <Route path="/train" element={<Navigate to="/active" replace />} />
                        <Route path="/workout" element={<Navigate to="/active" replace />} />
                        <Route path="/kratos-split" element={<Navigate to="/kratos" replace />} />
                        <Route path="/profile" element={<Navigate to="/settings" replace />} />
                        {/* Catch-all: unknown paths redirect home rather than blank */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </ErrorBoundary>
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
