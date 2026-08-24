import re

with open('src/types/index.ts', 'r') as f:
    content = f.read()

old_audit = """export interface AuditLog {
  id: string;
  actorId: string;
  action: string;
  module: string;
  targetId: string;
  details: string;
  timestamp: string;
}"""

new_audit = """export interface AuditLog {
  id: string;
  actorId: string;
  action: string;
  module: string;
  targetId: string;
  details: string;
  timestamp: string;
  hash?: string;
  previousHash?: string;
}"""

content = content.replace(old_audit, new_audit)
with open('src/types/index.ts', 'w') as f:
    f.write(content)
