import re
import glob

files = [
    'src/components/BulkPrintModal.tsx',
    'src/components/PrintPreviewModal.tsx',
    'src/components/PDFExportModal.tsx',
    'src/pages/Voucher.tsx'
]

for file_path in files:
    with open(file_path, 'r') as f:
        content = f.read()

    # Generic date replacements
    content = content.replace("new Date(inv.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })", "new Date(inv.updatedAt || inv.date).toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })")
    content = content.replace("new Date(invoice.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })", "new Date(invoice.updatedAt || invoice.date).toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })")

    with open(file_path, 'w') as f:
        f.write(content)
