import re

path = "src/components/EmailInvoiceModal.tsx"
with open(path, 'r') as f:
    content = f.read()

# Add settings default values
old_state = """  const [subject, setSubject] = useState(`Voucher: ${invoice?.invoiceNumber || ''} - ${invoice?.purpose.substring(0, 30) || ''}`);
  const [body, setBody] = useState(`Please find attached the miscellaneous expense voucher (${invoice?.invoiceNumber}) for your review and processing.`);"""

new_state = """  const [subject, setSubject] = useState(
    settings?.defaultEmailSubject 
      ? settings.defaultEmailSubject.replace('{invoice_no}', invoice?.invoiceNumber || '')
      : `Voucher: ${invoice?.invoiceNumber || ''} - ${invoice?.purpose.substring(0, 30) || ''}`
  );
  const [body, setBody] = useState(
    settings?.defaultEmailBody || `Please find attached the miscellaneous expense voucher (${invoice?.invoiceNumber}) for your review and processing.`
  );
  
  useEffect(() => {
    if (isOpen && settings?.defaultEmailSubject) {
      setSubject(settings.defaultEmailSubject.replace('{invoice_no}', invoice?.invoiceNumber || ''));
    }
    if (isOpen && settings?.defaultEmailBody) {
      setBody(settings.defaultEmailBody);
    }
  }, [isOpen, settings, invoice]);"""

content = content.replace(old_state, new_state)

with open(path, 'w') as f:
    f.write(content)
