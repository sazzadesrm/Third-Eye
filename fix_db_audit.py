import re

with open('src/lib/db.ts', 'r') as f:
    content = f.read()

# Helper function to compute SHA-256
hash_helper = """
async function computeHash(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
"""

if "async function computeHash" not in content:
    content = content.replace("export const db = {", hash_helper + "\nexport const db = {")

old_add = """    add: async (actorId: string, action: string, module: string, targetId: string, details: string) => {
      const all = await db.auditLogs.getAll();
      all.push({
        id: crypto.randomUUID(),
        actorId,
        action,
        module,
        targetId,
        details,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('te_audit_logs', JSON.stringify(all));
    }"""

new_add = """    add: async (actorId: string, action: string, module: string, targetId: string, details: string) => {
      const all = await db.auditLogs.getAll();
      const previousLog = all.length > 0 ? all[all.length - 1] : null;
      const previousHash = previousLog?.hash || '0000000000000000000000000000000000000000000000000000000000000000';
      const id = crypto.randomUUID();
      const timestamp = new Date().toISOString();
      const payload = `${id}|${actorId}|${action}|${module}|${targetId}|${details}|${timestamp}|${previousHash}`;
      const hash = await computeHash(payload);
      
      all.push({
        id,
        actorId,
        action,
        module,
        targetId,
        details,
        timestamp,
        hash,
        previousHash
      });
      localStorage.setItem('te_audit_logs', JSON.stringify(all));
    }"""

content = content.replace(old_add, new_add)
with open('src/lib/db.ts', 'w') as f:
    f.write(content)
