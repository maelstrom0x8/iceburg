import { useState, useEffect, useRef } from "react";

export function AppSettingsMenu() {
  const [open, setOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return document.documentElement.classList.contains("dark");
  });
  const [testMode, setTestMode] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        type="button"
        className="flex items-center justify-center p-2 rounded-lg border transition-colors"
        aria-label="Settings"
        aria-expanded={open}
        style={{
          borderColor: "var(--color-app-border-2)",
          color: "var(--color-app-text)",
          background: "transparent",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "var(--color-app-surface-2)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
        }}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.75}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-64 rounded-2xl border shadow-xl p-3 z-50 space-y-2 text-xs"
          style={{
            background: "var(--color-app-surface)",
            borderColor: "var(--color-app-border)",
            color: "var(--color-app-text)",
          }}
        >
          {/* Dark Mode toggle */}
          <div className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[var(--color-app-surface-2)]">
            <span className="font-medium">Dark Mode</span>
            <button
              onClick={toggleDarkMode}
              type="button"
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                darkMode ? "bg-accent" : "bg-gray-300 dark:bg-gray-600"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  darkMode ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Test Mode toggle */}
          <div className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[var(--color-app-surface-2)]">
            <span className="font-medium">Test Mode (Foundry)</span>
            <button
              onClick={() => setTestMode(!testMode)}
              type="button"
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                testMode ? "bg-accent" : "bg-gray-300 dark:bg-gray-600"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  testMode ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="h-px mx-2" style={{ background: "var(--color-app-border)" }} />

          {/* Language option */}
          <div className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[var(--color-app-surface-2)] cursor-pointer">
            <span className="font-medium">Language</span>
            <span style={{ color: "var(--color-app-muted)" }}>English &rsaquo;</span>
          </div>

          {/* Watch Wallet option */}
          <div className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[var(--color-app-surface-2)] cursor-pointer">
            <span className="font-medium">Watch Wallet</span>
            <span style={{ color: "var(--color-app-muted)" }}>Read-only &rsaquo;</span>
          </div>
        </div>
      )}
    </div>
  );
}
