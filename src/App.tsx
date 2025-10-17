import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@store/authStore";
import { useTheme } from "@hooks/useTheme";

const App = () => {
  const location = useLocation();
  const { status, user, bootstrap } = useAuthStore();

  useTheme();

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  if (status === "initializing") {
    return (
      <div className="flex h-screen items-center justify-center bg-surface text-text">
        <div className="animate-pulse rounded-2xl bg-surface-elevated p-10 shadow-subtle">
          <p className="text-lg font-medium">Preparing StudyNest...</p>
        </div>
      </div>
    );
  }

  if (status === "authenticated" && location.pathname === "/") {
    return <Navigate to="/dashboard" replace />;
  }

  if (status !== "authenticated" && location.pathname.startsWith("/dashboard")) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-surface text-text transition-colors duration-300 ease-smooth">
      <Outlet />
    </div>
  );
};

export default App;
