import re

path = "src/pages/Voucher.tsx"
with open(path, 'r') as f:
    content = f.read()

if "import { EmailInvoiceModal }" not in content:
    content = content.replace(
        "import { PDFExportModal } from '../components/PDFExportModal';",
        "import { PDFExportModal } from '../components/PDFExportModal';\nimport { EmailInvoiceModal } from '../components/EmailInvoiceModal';\nimport { PrintPreviewModal } from '../components/PrintPreviewModal';"
    )

content = content.replace("onClick={() => window.print()}", "onClick={() => setIsPrintPreviewOpen(true)}")

if "isPrintPreviewOpen" not in content:
    content = content.replace(
        "const [isBrandedPDFOpen, setIsBrandedPDFOpen] = useState(false);",
        "const [isBrandedPDFOpen, setIsBrandedPDFOpen] = useState(false);\n  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);"
    )

old_email = """      <PromptModal 
        isOpen={isEmailModalOpen}
        title="Email Voucher"
        message="Please enter the email address to send this voucher to:"
        onConfirm={handleEmail}
        onCancel={() => setIsEmailModalOpen(false)}
      />"""

new_email = """      <EmailInvoiceModal 
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        invoice={invoice}
        expenseSource={expenseSource || undefined}
        paymentType={paymentType || undefined}
        preparedBy={preparedBy || undefined}
        verifiedBy={verifiedBy || undefined}
        approvedBy={approvedBy || undefined}
        receivedBy={receivedBy || undefined}
        settings={settings || undefined}
        onSuccessNotice={setActionNotice}
      />
      
      <PrintPreviewModal
        isOpen={isPrintPreviewOpen}
        onClose={() => setIsPrintPreviewOpen(false)}
        invoice={invoice}
        expenseSource={expenseSource || undefined}
        paymentType={paymentType || undefined}
        preparedBy={preparedBy || undefined}
        verifiedBy={verifiedBy || undefined}
        approvedBy={approvedBy || undefined}
        receivedBy={receivedBy || undefined}
        settings={settings || undefined}
        onOpenEmail={() => {
          setIsPrintPreviewOpen(false);
          setIsEmailModalOpen(true);
        }}
      />"""

content = content.replace(old_email, new_email)

with open(path, 'w') as f:
    f.write(content)

