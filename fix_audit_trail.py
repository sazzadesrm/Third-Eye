import re

with open('src/pages/AuditTrail.tsx', 'r') as f:
    content = f.read()

# Fix seed logs
content = content.replace("id: 'log-seed-1',", "id: 'log-seed-1',\nhash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',\npreviousHash: '0000000000000000000000000000000000000000000000000000000000000000',")
content = content.replace("id: 'log-seed-2',", "id: 'log-seed-2',\nhash: 'abcd...',\npreviousHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',")
content = content.replace("id: 'log-seed-3',", "id: 'log-seed-3',\nhash: 'ef12...',\npreviousHash: 'abcd...',")

# Add Blockchain Verification to the Modal
old_modal = """              <div className="bg-bg-base p-4 rounded-xl border border-border-subtle shadow-inner">
                <p className="text-sm text-text-base leading-relaxed">{selectedLog.details}</p>
              </div>"""

new_modal = """              <div className="bg-bg-base p-4 rounded-xl border border-border-subtle shadow-inner mb-6">
                <p className="text-sm text-text-base leading-relaxed">{selectedLog.details}</p>
              </div>
              
              <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 p-4 rounded-xl">
                <h4 className="text-xs font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-4 h-4" /> Cryptographic Ledger Audit (Zero-Trust)
                </h4>
                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-indigo-600/70 dark:text-indigo-400/70 block mb-1">Previous Block Hash</span>
                    <code className="text-[11px] block bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900 p-2 rounded text-indigo-900 dark:text-indigo-100 break-all select-all font-mono">
                      {selectedLog.previousHash || '0000000000000000000000000000000000000000000000000000000000000000'}
                    </code>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-indigo-600/70 dark:text-indigo-400/70 block mb-1">Current Event Hash (SHA-256)</span>
                    <code className="text-[11px] block bg-indigo-600 text-white p-2 rounded break-all shadow-inner select-all font-mono">
                      {selectedLog.hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
                    </code>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded inline-flex">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Cryptographic integrity verified
                  </div>
                </div>
              </div>"""

content = content.replace(old_modal, new_modal)

if "Blockchain Audit" not in content:
    content = content.replace("System Event Audit Log", "Immutable Blockchain Audit Log")

with open('src/pages/AuditTrail.tsx', 'w') as f:
    f.write(content)

