import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { LayoutDashboard, Cpu, ShieldAlert, Sun, Moon } from "lucide-react";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import Dashboard from "./components/Dashboard";
import DeviceList from "./components/DeviceList";
import ThreatsPage from "./components/ThreatsPage";

function AppContent() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-60 flex-col border-r border-border bg-card/50 backdrop-blur-xl shadow-xl">
        <div className="flex h-16 items-center border-b border-border px-6">
          <span className="text-xl font-bold tracking-tight text-primary">OdinEye</span>
          <span className="ml-2 text-xs font-medium text-muted-foreground uppercase tracking-widest">
            Dashboard
          </span>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? "bg-primary/15 text-primary border-l-2 border-primary -ml-px pl-[15px]"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`
            }
          >
            <LayoutDashboard className="h-5 w-5" />
            Dashboard
          </NavLink>
          <NavLink
            to="/devices"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? "bg-primary/15 text-primary border-l-2 border-primary -ml-px pl-[15px]"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`
            }
          >
            <Cpu className="h-5 w-5" />
            Devices
          </NavLink>
          <NavLink
            to="/threats"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? "bg-primary/15 text-primary border-l-2 border-primary -ml-px pl-[15px]"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`
            }
          >
            <ShieldAlert className="h-5 w-5" />
            Threats
          </NavLink>
        </nav>
        <div className="border-t border-border p-3">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
        </div>
      </aside>
      <main className="ml-60 min-h-screen p-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/devices" element={<DeviceList />} />
          <Route path="/threats" element={<ThreatsPage />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
