import re

with open('src/components/Header.tsx', 'r') as f:
    content = f.read()

content = content.replace("import { RefreshCw, useAuthStore", "import { useAuthStore")
content = content.replace("import { RefreshCw, Notification", "import { Notification")
content = content.replace("import { RefreshCw, cn", "import { cn")
content = content.replace("import { RefreshCw, useNavigate", "import { useNavigate")

if "ShieldCheck\n}" in content:
    content = content.replace("ShieldCheck\n}", "ShieldCheck, Wifi, Cloud, CloudOff, RefreshCw\n}")

state_addition = """  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setIsSyncing(true);
      setTimeout(() => setIsSyncing(false), 2000);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);"""

if "const [isOnline" not in content:
    content = content.replace("  const searchInputRef = useRef<HTMLInputElement>(null);", "  const searchInputRef = useRef<HTMLInputElement>(null);\n" + state_addition)


old_right = """      {/* Right Header Navigation & Modals Controls */}
      <div className="flex items-center gap-2 sm:gap-3">"""

new_right = """      {/* Right Header Navigation & Modals Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Cloud Sync Status */}
        <div className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
          !isOnline 
            ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:text-amber-500 dark:border-amber-900/50' 
            : isSyncing
            ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:text-blue-500 dark:border-blue-900/50 animate-pulse'
            : 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-500 dark:border-emerald-900/50'
        }`}>
          {isSyncing ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : !isOnline ? (
            <CloudOff className="w-3.5 h-3.5" />
          ) : (
            <Cloud className="w-3.5 h-3.5" />
          )}
          <span className="hidden xl:inline uppercase tracking-wider">
            {!isOnline ? 'Offline' : isSyncing ? 'Syncing...' : 'Synced'}
          </span>
        </div>"""

content = content.replace(old_right, new_right)

with open('src/components/Header.tsx', 'w') as f:
    f.write(content)
