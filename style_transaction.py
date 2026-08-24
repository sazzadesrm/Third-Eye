with open('src/pages/Voucher.tsx', 'r') as f:
    content = f.read()

# Add more icons to imports if needed
if 'Building' not in content:
    content = content.replace("Edit2, Palette, Sparkles, Calendar, User, FileText, CheckSquare, CreditCard", "Edit2, Palette, Sparkles, Calendar, User, FileText, CheckSquare, CreditCard, Building, Tags, Wallet")

old_tx = """        {/* Transaction Details */}
        <div className="mb-6 p-4 border border-black bg-gray-50 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Concern Person / Vendor</p>
              <p className="font-medium text-black">{expenseSource?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Expense Type</p>
              <p className="font-medium text-black">{expenseSource?.name || 'General Expense'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Payment Type / Source</p>
              <p className="font-medium text-black">{paymentType?.name || 'N/A'}</p>
            </div>
          </div>
        </div>"""

new_tx = """        {/* Transaction Details */}
        <div className="mb-6 p-4 border border-gray-300 bg-slate-50 rounded text-sm print:border-black print:rounded-none">
          <div className="grid grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <div className="mt-1"><Building className="w-5 h-5 text-indigo-500 print:text-black" /></div>
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-0.5">Concern Person / Vendor</p>
                <p className="font-bold text-black text-base">{expenseSource?.name || 'N/A'}</p>
                {expenseSource?.address && <p className="text-xs text-gray-600 mt-1">{expenseSource.address}</p>}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1"><Tags className="w-5 h-5 text-indigo-500 print:text-black" /></div>
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-0.5">Expense Type</p>
                <p className="font-bold text-black text-base">{expenseSource?.name || 'General Expense'}</p>
              </div>
            </div>
            <div className="col-span-2 flex items-start gap-3 border-t border-gray-200 pt-3 print:border-black">
              <div className="mt-1"><Wallet className="w-5 h-5 text-indigo-500 print:text-black" /></div>
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-0.5">Payment Type / Source</p>
                <p className="font-bold text-black text-base">{paymentType?.name || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>"""

content = content.replace(old_tx, new_tx)

with open('src/pages/Voucher.tsx', 'w') as f:
    f.write(content)
