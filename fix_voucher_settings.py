import re

path = "src/pages/Voucher.tsx"
with open(path, 'r') as f:
    content = f.read()

if "import { AppSettings" not in content:
    content = content.replace("import { Invoice, ExpenseSource, PaymentType, Person, InvoiceStatus }", "import { Invoice, ExpenseSource, PaymentType, Person, InvoiceStatus, AppSettings }")

if "const [settings" not in content:
    content = content.replace(
        "const [receivedBy, setReceivedBy] = useState<Person | null>(null);",
        "const [receivedBy, setReceivedBy] = useState<Person | null>(null);\n  const [settings, setSettings] = useState<AppSettings | null>(null);"
    )

    fetch_old = """      const expList = await db.expenseSources.getAll();
      const payList = await db.paymentTypes.getAll();
      const peopleList = await db.people.getAll();"""
    fetch_new = """      const expList = await db.expenseSources.getAll();
      const payList = await db.paymentTypes.getAll();
      const peopleList = await db.people.getAll();
      const loadedSettings = await db.settings.get();
      setSettings(loadedSettings);"""
      
    content = content.replace(fetch_old, fetch_new)

with open(path, 'w') as f:
    f.write(content)
