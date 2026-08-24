import re
with open('src/pages/MasterData.tsx', 'r') as f:
    content = f.read()
if "ConfirmModal" in content:
    print("ConfirmModal is there")
