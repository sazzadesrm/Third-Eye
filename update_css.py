import re

with open('src/index.css', 'r') as f:
    content = f.read()

# Replace root variables to support data-theme and data-accent
new_css = """@import "tailwindcss";

@theme {
  --color-accent-50: var(--accent-50);
  --color-accent-100: var(--accent-100);
  --color-accent-200: var(--accent-200);
  --color-accent-500: var(--accent-500);
  --color-accent-600: var(--accent-600);
  --color-accent-700: var(--accent-700);
  --color-bg-base: var(--bg-base);
  --color-bg-panel: var(--bg-panel);
  --color-text-base: var(--text-base);
  --color-text-muted: var(--text-muted);
  --color-border-subtle: var(--border-subtle);
}

/* Default Light Theme */
:root {
  --bg-base: #f8fafc;
  --bg-panel: #ffffff;
  --text-base: #0f172a;
  --text-muted: #64748b;
  --border-subtle: #e2e8f0;
  
  /* Default Blue Accent */
  --accent-50: #eff6ff;
  --accent-100: #dbeafe;
  --accent-200: #bfdbfe;
  --accent-500: #3b82f6;
  --accent-600: #2563eb;
  --accent-700: #1d4ed8;
}

[data-theme="dark"], .dark {
  --bg-base: #0f172a;
  --bg-panel: #1e293b;
  --text-base: #f8fafc;
  --text-muted: #94a3b8;
  --border-subtle: #334155;
}

[data-theme="light"], .light {
  --bg-base: #f8fafc;
  --bg-panel: #ffffff;
  --text-base: #0f172a;
  --text-muted: #64748b;
  --border-subtle: #e2e8f0;
}

[data-accent="blue"] {
  --accent-50: #eff6ff;
  --accent-100: #dbeafe;
  --accent-200: #bfdbfe;
  --accent-500: #3b82f6;
  --accent-600: #2563eb;
  --accent-700: #1d4ed8;
}

[data-accent="emerald"] {
  --accent-50: #ecfdf5;
  --accent-100: #d1fae5;
  --accent-200: #a7f3d0;
  --accent-500: #10b981;
  --accent-600: #059669;
  --accent-700: #047857;
}

[data-accent="indigo"] {
  --accent-50: #eef2ff;
  --accent-100: #e0e7ff;
  --accent-200: #c7d2fe;
  --accent-500: #6366f1;
  --accent-600: #4f46e5;
  --accent-700: #4338ca;
}

[data-accent="violet"] {
  --accent-50: #f5f3ff;
  --accent-100: #ede9fe;
  --accent-200: #ddd6fe;
  --accent-500: #8b5cf6;
  --accent-600: #7c3aed;
  --accent-700: #6d28d9;
}

[data-accent="rose"] {
  --accent-50: #fff1f2;
  --accent-100: #ffe4e6;
  --accent-200: #fecdd3;
  --accent-500: #f43f5e;
  --accent-600: #e11d48;
  --accent-700: #be123c;
}

[data-accent="amber"] {
  --accent-50: #fffbeb;
  --accent-100: #fef3c7;
  --accent-200: #fde68a;
  --accent-500: #f59e0b;
  --accent-600: #d97706;
  --accent-700: #b45309;
}

body {
  background-color: var(--bg-base);
  color: var(--text-base);
}
"""

with open('src/index.css', 'w') as f:
    f.write(new_css)

