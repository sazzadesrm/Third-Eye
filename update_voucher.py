import re

with open('src/pages/Voucher.tsx', 'r') as f:
    content = f.read()

# Add PromptModal import
content = content.replace("import { PDFExportModal } from '../components/PDFExportModal';", "import { PDFExportModal } from '../components/PDFExportModal';\nimport { PromptModal } from '../components/PromptModal';")

# Add state
content = content.replace("const [actionNotice, setActionNotice] = useState<string | null>(null);", "const [actionNotice, setActionNotice] = useState<string | null>(null);\n  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);")

# Change handleEmail
handle_email_old = """  const handleEmail = async () => {
    const email = window.prompt("Enter recipient email address for invoice dispatch:");
    if (!email) return;"""

handle_email_new = """  const handleEmail = async (email: string) => {
    setIsEmailModalOpen(false);
    if (!email) return;"""
content = content.replace(handle_email_old, handle_email_new)

# Add PromptModal component to render
prompt_modal_jsx = """      {/* Actual Printable A4 Voucher */}
      <PromptModal 
        isOpen={isEmailModalOpen}
        title="Email Voucher"
        message="Please enter the email address to send this voucher to:"
        onConfirm={handleEmail}
        onCancel={() => setIsEmailModalOpen(false)}
      />
"""
content = content.replace("      {/* Actual Printable A4 Voucher */}", prompt_modal_jsx)

# Change email button onClick
content = content.replace("onClick={handleEmail}", "onClick={() => setIsEmailModalOpen(true)}")

# Change Date format
# In the A4 Voucher
content = content.replace("new Date(invoice.date).toLocaleDateString()", "new Date(invoice.updatedAt || invoice.date).toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })")

# Signatures in A4 Voucher
old_metadata = """            <p><span className="font-semibold w-28 inline-block">Prepared By:</span> {preparedBy?.name || 'N/A'}</p>
            <p><span className="font-semibold w-28 inline-block">Verified By:</span> {verifiedBy?.name || 'N/A'}</p>"""
new_metadata = """            <p><span className="font-semibold w-28 inline-block">Prepared By:</span> {preparedBy?.name || 'N/A'}</p>
            <p><span className="font-semibold w-28 inline-block">Verified By:</span> {verifiedBy?.name || 'N/A'}</p>
            <p><span className="font-semibold w-28 inline-block">Received By:</span> {receivedBy?.name || 'N/A'}</p>"""
content = content.replace(old_metadata, new_metadata)

old_signatures = """        {/* Signature Section */}
        <div className="mt-8">
          <div className="grid grid-cols-3 gap-8 text-sm text-center text-black">
            <div>
              <div className="border-t-2 border-black pt-2 mb-1 font-bold">Received By</div>
              <p className="font-medium">{receivedBy?.name || '________________'}</p>
            </div>
            <div>
              <div className="border-t-2 border-black pt-2 mb-1 font-bold">Verified By</div>
              <p className="font-medium">{verifiedBy?.name || '________________'}</p>
            </div>
            <div>
              <div className="border-t-2 border-black pt-2 mb-1 font-bold">Authorized Approval</div>
              <p className="font-medium">{approvedBy?.name || (invoice.status === 'Approved' ? 'Authorized Officer' : '________________')}</p>
            </div>
          </div>
        </div>"""
new_signatures = """        {/* Signature Section */}
        <div className="mt-16 flex justify-end">
          <div className="w-1/3 text-sm text-center text-black">
            <div className="border-t-2 border-black pt-2 mb-1 font-bold">Authorized Approval</div>
            <p className="font-medium">{approvedBy?.name || (invoice.status === 'Approved' ? 'Authorized Officer' : '________________')}</p>
          </div>
        </div>"""
content = content.replace(old_signatures, new_signatures)

with open('src/pages/Voucher.tsx', 'w') as f:
    f.write(content)
