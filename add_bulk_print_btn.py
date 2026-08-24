import re

path = "src/pages/Invoices.tsx"
with open(path, 'r') as f:
    content = f.read()

old_btn = """                {/* Batch Delete */}"""
new_btn = """                {/* Bulk Print */}
                <button
                  onClick={() => setIsBulkPrintOpen(true)}
                  disabled={isBulkProcessing}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
                  title="Print all selected vouchers"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Batch</span>
                </button>
                
                {/* Batch Delete */}"""

if "Print Batch" not in content:
    content = content.replace(old_btn, new_btn)
    
if "Printer" not in content:
    content = content.replace("Plus, Search, Eye, Download, Upload, Edit2, FileText, FileSpreadsheet,", "Plus, Search, Eye, Download, Upload, Edit2, FileText, FileSpreadsheet, Printer,")

with open(path, 'w') as f:
    f.write(content)
