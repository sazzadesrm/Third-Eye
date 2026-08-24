import re

with open('src/components/PDFExportModal.tsx', 'r') as f:
    content = f.read()

# Date format
content = content.replace("new Date(invoice.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })", "new Date(invoice.updatedAt || invoice.date).toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })")

# Add received and verified to metadata block
old_meta = """                  <p className="flex items-center">
                    <span className="font-bold text-slate-600 w-28">Prepared By:</span>
                    <span className="text-slate-900 font-medium">{preparedBy?.name || 'Finance Executive'}</span>
                  </p>"""
new_meta = """                  <p className="flex items-center">
                    <span className="font-bold text-slate-600 w-28">Prepared By:</span>
                    <span className="text-slate-900 font-medium">{preparedBy?.name || 'Finance Executive'}</span>
                  </p>
                  <p className="flex items-center">
                    <span className="font-bold text-slate-600 w-28">Verified By:</span>
                    <span className="text-slate-900 font-medium">{verifiedBy?.name || 'Finance & Accounts'}</span>
                  </p>
                  <p className="flex items-center">
                    <span className="font-bold text-slate-600 w-28">Received By:</span>
                    <span className="text-slate-900 font-medium">{receivedBy?.name || 'Authorized Receiver'}</span>
                  </p>"""
content = content.replace(old_meta, new_meta)

# Remove received and verified from signature block
old_sig = """              {/* Signatures Section */}
              {branding.showSignatures && (
                <div className={`mt-8 ${branding.templateStyle === 'compact' ? 'mb-2' : 'mb-6'}`}>
                  <div className="grid grid-cols-3 gap-6 text-xs text-center text-slate-900">
                    <div>
                      <div className={`pt-2 mb-1 font-bold ${
                        branding.templateStyle === 'classic' ? 'border-t-2 border-slate-900' : 
                        branding.templateStyle === 'executive' ? 'border-t border-slate-400' : 
                        'border-t-2 border-slate-900'
                      }`}>Received By</div>
                      <p className="font-semibold">{receivedBy?.name || '________________'}</p>
                      <p className="text-[10px] text-slate-500">{receivedBy?.designation || 'Sign & Date'}</p>
                    </div>
                    <div>
                      <div className={`pt-2 mb-1 font-bold ${
                        branding.templateStyle === 'classic' ? 'border-t-2 border-slate-900' : 
                        branding.templateStyle === 'executive' ? 'border-t border-slate-400' : 
                        'border-t-2 border-slate-900'
                      }`}>Verified By</div>
                      <p className="font-semibold">{verifiedBy?.name || '________________'}</p>
                      <p className="text-[10px] text-slate-500">{verifiedBy?.designation || 'Finance & Accounts'}</p>
                    </div>
                    <div>
                      <div className={`pt-2 mb-1 font-bold ${
                        branding.templateStyle === 'classic' ? 'border-t-2 border-slate-900' : 
                        branding.templateStyle === 'executive' ? 'border-t border-slate-400' : 
                        'border-t-2 border-slate-900'
                      }`}>Authorized Approval</div>
                      <p className="font-semibold">{approvedBy?.name || (invoice.status === 'Approved' ? 'Authorized Officer' : '________________')}</p>
                      <p className="text-[10px] text-slate-500">{approvedBy?.designation || 'Managing Director'}</p>
                    </div>
                  </div>
                </div>
              )}"""

new_sig = """              {/* Signatures Section */}
              {branding.showSignatures && (
                <div className={`mt-16 flex justify-end ${branding.templateStyle === 'compact' ? 'mb-2' : 'mb-6'}`}>
                  <div className="w-1/3 text-xs text-center text-slate-900">
                    <div className={`pt-2 mb-1 font-bold ${
                      branding.templateStyle === 'classic' ? 'border-t-2 border-slate-900' : 
                      branding.templateStyle === 'executive' ? 'border-t border-slate-400' : 
                      'border-t-2 border-slate-900'
                    }`}>Authorized Approval</div>
                    <p className="font-semibold">{approvedBy?.name || (invoice.status === 'Approved' ? 'Authorized Officer' : '________________')}</p>
                    <p className="text-[10px] text-slate-500">{approvedBy?.designation || 'Managing Director'}</p>
                  </div>
                </div>
              )}"""

content = content.replace(old_sig, new_sig)

with open('src/components/PDFExportModal.tsx', 'w') as f:
    f.write(content)
