with open('index.html', 'r') as f:
    content = f.read()

head_addition = """    <link rel="manifest" href="/manifest.json" />
    <meta name="theme-color" content="#1e3a8a" />
    <link rel="apple-touch-icon" href="/vite.svg" />"""

body_addition = """    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/sw.js').then(registration => {
            console.log('SW registered: ', registration);
          }).catch(registrationError => {
            console.log('SW registration failed: ', registrationError);
          });
        });
      }
    </script>"""

if "<link rel=\"manifest\"" not in content:
    content = content.replace("</head>", head_addition + "\n  </head>")
    content = content.replace("</body>", body_addition + "\n  </body>")

with open('index.html', 'w') as f:
    f.write(content)
