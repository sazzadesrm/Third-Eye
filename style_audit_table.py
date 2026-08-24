import re
with open('src/pages/AuditTrail.tsx', 'r') as f:
    content = f.read()

old_action_col = """                      {/* Action Type */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase border ${
                          log.action.includes('Delete') ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50' : 
                          log.action.includes('Approve') ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50' : 
                          log.action.includes('Reject') || log.action.includes('Return') ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50' :
                          'bg-accent-50 text-accent-700 border-accent-200 dark:bg-accent-950/30 dark:text-accent-400 dark:border-accent-900/50'
                        }`}>
                          {log.action}
                        </span>
                      </td>"""

new_action_col = """                      {/* Action Type & Block Hash */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1.5 items-start">
                          <span className={`inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase border ${
                            log.action.includes('Delete') ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50' : 
                            log.action.includes('Approve') ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50' : 
                            log.action.includes('Reject') || log.action.includes('Return') ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50' :
                            'bg-accent-50 text-accent-700 border-accent-200 dark:bg-accent-950/30 dark:text-accent-400 dark:border-accent-900/50'
                          }`}>
                            {log.action}
                          </span>
                          <span className="text-[10px] font-mono text-indigo-500/70 dark:text-indigo-400/70 truncate w-32" title={log.hash}>
                            0x{log.hash?.substring(0,8) || 'e3b0c442'}...
                          </span>
                        </div>
                      </td>"""

content = content.replace(old_action_col, new_action_col)

with open('src/pages/AuditTrail.tsx', 'w') as f:
    f.write(content)

