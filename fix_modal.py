import re

with open('src/components/PDFExportModal.tsx', 'r') as f:
    content = f.read()

# I need to replace the section starting with:
# <div \n              ref={previewVoucherRef}\n              className="w-full max-w-[210mm] min-h-[280mm] bg-white text-slate-900 shadow-2xl p-[18mm] relative box-border overflow-hidden select-none"
# up to:
#            </div>\n          </div>\n        </div>\n        {/* Modal Footer Actions */}

replacement = """<div 
              ref={previewVoucherRef}
              className={`w-full max-w-[210mm] min-h-[280mm] bg-white text-slate-900 shadow-2xl relative box-border overflow-hidden select-none ${branding.templateStyle === 'compact' ? 'p-[12mm]' : 'p-[18mm]'}`}
              style={{ 
                fontFamily: branding.templateStyle === 'classic' ? "'Times New Roman', serif" : 
                            branding.templateStyle === 'executive' ? "'Inter', 'Roboto', sans-serif" : 
                            "'Helvetica Neue', Arial, sans-serif" 
              }}
            >
              {/* Top Accent Color Bar (Modern & Compact) */}
              {(branding.templateStyle === 'modern' || branding.templateStyle === 'compact') && (
                <div 
                  className={`w-full mb-6 rounded-t-sm ${branding.templateStyle === 'compact' ? 'h-1.5' : 'h-2.5'}`}
                  style={{ backgroundColor: branding.themeColor }}
                />
              )}

              {/* Header */}
              <div className={`mb-5 flex items-start justify-between gap-4 ${
                branding.templateStyle === 'classic' ? 'border-b-4 border-double pb-5 border-slate-900' : 
                branding.templateStyle === 'executive' ? 'border-b border-slate-200 pb-5' : 
                'border-b-2 pb-5'
              }`} style={branding.templateStyle === 'modern' || branding.templateStyle === 'compact' ? { borderColor: branding.themeColor } : {}}>
                <div className="flex items-start gap-4">
                  {/* Monogram / Logo */}
                  <div 
                    className={`w-14 h-14 flex items-center justify-center font-bold text-2xl shrink-0 ${
                      branding.templateStyle === 'modern' || branding.templateStyle === 'compact' ? 'rounded-lg text-white shadow-sm' : 
                      branding.templateStyle === 'classic' ? 'rounded-full border-2 border-slate-900 text-slate-900' : 
                      'rounded-md border border-slate-200'
                    }`}
                    style={branding.templateStyle === 'modern' || branding.templateStyle === 'compact' ? { backgroundColor: branding.themeColor } : 
                           branding.templateStyle === 'executive' ? { color: branding.themeColor, borderColor: branding.themeColor } : {}}
                  >
                    {branding.logoInitials || 'W'}
                  </div>
                  <div>
                    <h1 className={`text-xl font-black uppercase tracking-tight text-slate-900 ${
                      branding.templateStyle === 'executive' ? 'font-light tracking-widest' : ''
                    }`}>
                      {branding.companyName}
                    </h1>
                    {branding.companySubtitle && (
                      <p className={`text-xs font-bold text-slate-700 uppercase mt-0.5 ${
                        branding.templateStyle === 'executive' ? 'tracking-widest font-normal' : 'tracking-wider'
                      }`}>
                        {branding.companySubtitle}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-500 leading-tight mt-1 max-w-md">
                      {branding.companyAddress}
                    </p>
                    {(branding.companyPhone || branding.companyEmail || (branding.showTaxBin && branding.companyTaxId)) && (
                      <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-600 mt-1 font-medium">
                        {branding.companyPhone && <span>Tel: {branding.companyPhone}</span>}
                        {branding.companyEmail && <span>Email: {branding.companyEmail}</span>}
                        {branding.showTaxBin && branding.companyTaxId && (
                          <span className="font-bold text-slate-800">{branding.companyTaxId}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Header: Voucher Title Badge & QR */}
                <div className="flex flex-col items-end shrink-0">
                  <div 
                    className={`px-4 py-1 text-xs uppercase tracking-widest mb-2 text-center ${
                      branding.templateStyle === 'modern' || branding.templateStyle === 'compact' ? 'rounded-sm text-white font-black' : 
                      branding.templateStyle === 'classic' ? 'border-2 border-slate-900 text-slate-900 font-bold' : 
                      'border border-slate-300 text-slate-700 font-medium'
                    }`}
                    style={branding.templateStyle === 'modern' || branding.templateStyle === 'compact' ? { backgroundColor: branding.themeColor } : {}}
                  >
                    Expense Voucher
                  </div>
                  {branding.showQrCode && (
                    <div className={`p-1 flex flex-col items-center ${
                      branding.templateStyle === 'classic' ? 'border-2 border-slate-900' : 'border border-slate-300 bg-slate-50 rounded'
                    }`}>
                      <QRCodeSVG value={`https://whiplc.com/verify/${invoice.sealCode || invoice.invoiceNumber}`} size={56} />
                      <span className="text-[8px] font-mono text-slate-500 mt-0.5 tracking-tighter">AUTHENTICATED</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Metadata Info Grid */}
              <div className={`grid grid-cols-2 mb-5 text-xs ${
                branding.templateStyle === 'modern' ? 'gap-4 p-3.5 bg-slate-50 border border-slate-200 rounded-sm' : 
                branding.templateStyle === 'classic' ? 'gap-0 border-2 border-slate-900 [&>div]:p-3 [&>div:first-child]:border-r-2 [&>div:first-child]:border-slate-900' : 
                branding.templateStyle === 'executive' ? 'gap-6 p-1 border-b border-slate-200 pb-4' : 
                'gap-2 p-2 bg-slate-50 border border-slate-200'
              }`}>
                <div className="space-y-1.5">
                  <p className="flex items-center">
                    <span className="font-bold text-slate-600 w-28">Voucher No:</span>
                    <strong className="text-slate-900 font-mono font-bold text-sm">{invoice.invoiceNumber}</strong>
                  </p>
                  <p className="flex items-center">
                    <span className="font-bold text-slate-600 w-28">Voucher Date:</span>
                    <span className="text-slate-900">{new Date(invoice.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </p>
                  <p className="flex items-center">
                    <span className="font-bold text-slate-600 w-28">Prepared By:</span>
                    <span className="text-slate-900 font-medium">{preparedBy?.name || 'Finance Executive'}</span>
                  </p>
                </div>
                <div className={`space-y-1.5 ${branding.templateStyle === 'modern' || branding.templateStyle === 'compact' ? 'text-right sm:text-left' : ''}`}>
                  <p className="flex items-center">
                    <span className="font-bold text-slate-600 w-28">Vendor / Concern:</span>
                    <strong className="text-slate-900">{expenseSource?.name || 'N/A'}</strong>
                  </p>
                  <p className="flex items-center">
                    <span className="font-bold text-slate-600 w-28">Payment Category:</span>
                    <span className="text-slate-900">{paymentType?.name || 'General Operations'}</span>
                  </p>
                  <p className="flex items-center">
                    <span className="font-bold text-slate-600 w-28">Approval Status:</span>
                    <span className="uppercase font-bold text-slate-800 text-[11px] px-2 py-0.5 rounded bg-slate-200">
                      {invoice.status}
                    </span>
                  </p>
                </div>
              </div>

              {/* Itemized Table */}
              <table className={`w-full border-collapse mb-5 text-xs text-slate-900 ${
                branding.templateStyle === 'classic' ? 'border-2 border-slate-900' : 
                branding.templateStyle === 'executive' ? '' : 
                'border border-slate-900'
              }`}>
                <thead>
                  <tr style={
                    branding.templateStyle === 'modern' || branding.templateStyle === 'compact' ? { backgroundColor: branding.themeColor, color: '#ffffff' } : 
                    branding.templateStyle === 'executive' ? { backgroundColor: '#f8fafc', color: '#334155' } : 
                    { backgroundColor: '#f1f5f9', color: '#0f172a' }
                  }>
                    <th className={`px-3 py-2 text-center w-12 font-bold uppercase ${
                      branding.templateStyle === 'classic' ? 'border-2 border-slate-900' : 
                      branding.templateStyle === 'executive' ? 'border-b-2 border-slate-300' : 
                      'border border-slate-900'
                    }`}>Sl.</th>
                    <th className={`px-4 py-2 text-left font-bold uppercase ${
                      branding.templateStyle === 'classic' ? 'border-2 border-slate-900' : 
                      branding.templateStyle === 'executive' ? 'border-b-2 border-slate-300' : 
                      'border border-slate-900'
                    }`}>Particulars / Expenditure Description</th>
                    <th className={`px-4 py-2 text-right w-44 font-bold uppercase ${
                      branding.templateStyle === 'classic' ? 'border-2 border-slate-900' : 
                      branding.templateStyle === 'executive' ? 'border-b-2 border-slate-300' : 
                      'border border-slate-900'
                    }`}>Amount (BDT)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={`px-3 ${branding.templateStyle === 'compact' ? 'py-4' : 'py-10'} text-center align-top font-bold ${
                      branding.templateStyle === 'classic' ? 'border-2 border-slate-900' : 
                      branding.templateStyle === 'executive' ? 'border-b border-slate-200' : 
                      'border border-slate-900'
                    }`}>1</td>
                    <td className={`px-4 ${branding.templateStyle === 'compact' ? 'py-4' : 'py-10'} align-top ${
                      branding.templateStyle === 'classic' ? 'border-2 border-slate-900' : 
                      branding.templateStyle === 'executive' ? 'border-b border-slate-200' : 
                      'border border-slate-900'
                    }`}>
                      <p className="font-bold text-sm text-slate-900 mb-1">{invoice.purpose}</p>
                      {invoice.remarks && (
                        <p className="text-slate-600 text-xs mt-1">Note: {invoice.remarks}</p>
                      )}
                      {branding.showReviewNotes && invoice.reviewRemarks && (
                        <p className="text-emerald-800 text-xs italic mt-2 bg-emerald-50 p-2 border border-emerald-200 rounded">
                          Review Verification: {invoice.reviewRemarks}
                        </p>
                      )}
                    </td>
                    <td className={`px-4 ${branding.templateStyle === 'compact' ? 'py-4' : 'py-10'} text-right align-top font-bold text-base ${
                      branding.templateStyle === 'classic' ? 'border-2 border-slate-900' : 
                      branding.templateStyle === 'executive' ? 'border-b border-slate-200' : 
                      'border border-slate-900'
                    }`}>
                      {formatCurrency(invoice.amount)}
                    </td>
                  </tr>
                  <tr className="bg-slate-100 font-bold">
                    <td colSpan={2} className={`px-4 py-2.5 text-right uppercase tracking-wider text-xs ${
                      branding.templateStyle === 'classic' ? 'border-2 border-slate-900' : 
                      branding.templateStyle === 'executive' ? 'border-b-2 border-slate-400' : 
                      'border border-slate-900'
                    }`}>
                      Grand Total Payable:
                    </td>
                    <td className={`px-4 py-2.5 text-right font-black text-base text-slate-900 ${
                      branding.templateStyle === 'classic' ? 'border-2 border-slate-900' : 
                      branding.templateStyle === 'executive' ? 'border-b-2 border-slate-400' : 
                      'border border-slate-900'
                    }`}>
                      {formatCurrency(invoice.amount)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Amount In Words */}
              <div className={`mb-6 p-3 text-xs text-slate-900 ${
                branding.templateStyle === 'classic' ? 'border-2 border-slate-900 bg-slate-50' : 
                branding.templateStyle === 'executive' ? 'border-l-4 border-slate-400 pl-4 bg-slate-50/50' : 
                'border border-slate-900 bg-slate-50'
              }`}>
                <span className="font-bold uppercase tracking-wider text-slate-700 mr-2">Amount in Words:</span>
                <span className="font-semibold italic">{invoice.amountInWords || 'Amount in BDT'} Only.</span>
              </div>

              {/* Signatures Section */}
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
              )}

              {/* Legal Footer Note */}
              {branding.footerTerms && (
                <div className={`mt-6 pt-3 text-[9px] text-slate-500 text-center leading-relaxed ${
                  branding.templateStyle === 'classic' ? 'border-t-2 border-slate-900' : 
                  branding.templateStyle === 'executive' ? 'border-t border-slate-200' : 
                  'border-t border-slate-200'
                }`}>
                  {branding.footerTerms}
                </div>
              )}

              {/* Seal & Audit Bar */}
              <div className="mt-3 pt-2 border-t border-slate-200 text-[9px] text-slate-400 flex justify-between font-mono">
                <span>SEAL: {invoice.sealCode}</span>
                <span>REF: {invoice.referenceCode}</span>
                <span>GENERATED: {new Date().toLocaleString()}</span>
              </div>

              {/* Watermark Overlay */}
              {branding.showWatermark && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.06] pointer-events-none -rotate-45 z-0">
                  <span className="text-[120px] font-black tracking-widest border-[12px] border-slate-900 text-slate-900 px-12 py-4 rounded-2xl uppercase">
                    {invoice.status}
                  </span>
                </div>
              )}
            </div>"""

start_marker = r'<div \s+ref=\{previewVoucherRef\}\s+className="w-full max-w-\[210mm\] min-h-\[280mm\] bg-white text-slate-900 shadow-2xl p-\[18mm\] relative box-border overflow-hidden select-none"\s+style=\{\{\s*fontFamily: "\'Helvetica Neue\', Arial, sans-serif"\s*\}\}\s*>'
end_marker = r'            </div>\s*</div>\s*</div>\s*\{\/\* Modal Footer Actions \*\/\}'

# Try to find the section
match = re.search(start_marker + r'.*?' + end_marker, content, re.DOTALL)
if match:
    new_content = content[:match.start()] + replacement + "\n          </div>\n        </div>\n        {/* Modal Footer Actions */}" + content[match.end():]
    with open('src/components/PDFExportModal.tsx', 'w') as f:
        f.write(new_content)
    print("Successfully replaced!")
else:
    print("Could not find the section to replace.")
