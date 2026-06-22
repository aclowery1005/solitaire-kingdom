
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import AuthScreen from "./pages/AuthScreen";
import VerifyEmailGate from "./pages/VerifyEmailGate";
import GameShell from "./pages/GameShell";

function Router() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "radial-gradient(ellipse at top, #4a1f73 0%, #2d1150 38%, #1a0a30 70%, #100620 100%)",
        color: "#F2ECDB", fontFamily: "'JetBrains Mono', monospace", fontSize: 13,
      }}>
        Loading…
      </div>
    );
  }

  if (!user) return <AuthScreen />;
  if (!user.email_confirmed_at) return <VerifyEmailGate />;
  return <GameShell />;
}

export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}
