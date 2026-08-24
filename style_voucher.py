with open('src/pages/Voucher.tsx', 'r') as f:
    content = f.read()

# Add new lucide-react icons
if 'Calendar' not in content:
    content = content.replace("Edit2, Palette, Sparkles", "Edit2, Palette, Sparkles, Calendar, User, FileText, CheckSquare, CreditCard")

# Replace Metadata section with Icons and Labels
old_meta = """        {/* Voucher Metadata */}
        <div className="flex justify-between items-start mb-6 text-black text-sm">
          <div className="space-y-1">
            <p><span className="font-semibold w-28 inline-block">Invoice No:</span> {invoice.invoiceNumber}</p>
            <p><span className="font-semibold w-28 inline-block">Date:</span> {new Date(invoice.updatedAt || invoice.date).toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            <p><span className="font-semibold w-28 inline-block">Prepared By:</span> {preparedBy?.name || 'N/A'}</p>
            <p><span className="font-semibold w-28 inline-block">Verified By:</span> {verifiedBy?.name || 'N/A'}</p>
            <p><span className="font-semibold w-28 inline-block">Received By:</span> {receivedBy?.name || 'N/A'}</p>
            <p><span className="font-semibold w-28 inline-block">Workflow Status:</span> <strong className="uppercase">{invoice.status}</strong></p>
          </div>"""

new_meta = """        {/* Voucher Metadata */}
        <div className="flex justify-between items-start mb-6 text-black text-sm">
          <div className="space-y-2">
            <p className="flex items-center gap-2"><FileText className="w-4 h-4 text-gray-500" /> <span className="font-semibold w-32">Invoice No:</span> <span className="font-medium bg-gray-100 px-2 py-0.5 rounded">{invoice.invoiceNumber}</span></p>
            <p className="flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-500" /> <span className="font-semibold w-32">Date:</span> {new Date(invoice.updatedAt || invoice.date).toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            <p className="flex items-center gap-2"><User className="w-4 h-4 text-gray-500" /> <span className="font-semibold w-32">Prepared By:</span> {preparedBy?.name || 'N/A'}</p>
            <p className="flex items-center gap-2"><CheckSquare className="w-4 h-4 text-gray-500" /> <span className="font-semibold w-32">Verified By:</span> {verifiedBy?.name || 'N/A'}</p>
            <p className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-gray-500" /> <span className="font-semibold w-32">Received By:</span> {receivedBy?.name || 'N/A'}</p>
            <p className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-gray-500" /> 
              <span className="font-semibold w-32">Workflow Status:</span> 
              <strong className={`uppercase px-2 py-0.5 rounded-sm ${
                invoice.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 
                invoice.status === 'Pending' ? 'bg-amber-100 text-amber-800' : 
                invoice.status === 'Rejected' ? 'bg-rose-100 text-rose-800' : 
                'bg-gray-100'
              }`}>{invoice.status}</strong>
            </p>
          </div>"""

content = content.replace(old_meta, new_meta)

# Highlight Grand Total
old_total = """            <tr className="bg-gray-50">
              <td colSpan={2} className="border border-black px-4 py-3 text-right font-bold uppercase tracking-wider text-xs">Grand Total</td>
              <td className="border border-black px-4 py-3 text-right font-bold text-base">{invoice.amount.toLocaleString('en-IN')}</td>
            </tr>"""

new_total = """            <tr className="bg-blue-50 text-blue-900 border-blue-900">
              <td colSpan={2} className="border border-blue-900 print:border-black px-4 py-3 text-right font-bold uppercase tracking-wider text-xs">Grand Total</td>
              <td className="border border-blue-900 print:border-black px-4 py-3 text-right font-bold text-lg">{invoice.amount.toLocaleString('en-IN')}</td>
            </tr>"""

content = content.replace(old_total, new_total)

with open('src/pages/Voucher.tsx', 'w') as f:
    f.write(content)
