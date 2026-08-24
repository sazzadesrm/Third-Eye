import os

types_path = "src/types/index.ts"
with open(types_path, 'r') as f:
    content = f.read()

if "defaultEmailSubject" not in content:
    content = content.replace(
        "branding?: VoucherBrandingSettings;", 
        "branding?: VoucherBrandingSettings;\n  defaultEmailSubject?: string;\n  defaultEmailBody?: string;"
    )
    with open(types_path, 'w') as f:
        f.write(content)

settings_path = "src/pages/Settings.tsx"
with open(settings_path, 'r') as f:
    content = f.read()

if "defaultEmailSubject" not in content:
    old_branding = """        {/* Branding & Export Settings Section */}"""
    new_email = """        {/* Email Defaults Settings Section */}
        <div className="bg-bg-panel border border-border-subtle rounded-xl p-5 sm:p-6 shadow-sm mb-6">
          <h2 className="text-lg font-bold text-text-base mb-1 flex items-center gap-2">
            <Mail className="w-5 h-5 text-accent-600" /> Default Email Settings
          </h2>
          <p className="text-sm text-text-muted mb-6">Customize the default email subject and message when sending vouchers to users.</p>
          
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-text-base">Default Subject</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 bg-bg-base border border-border-subtle rounded-lg text-text-base focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition-shadow outline-none"
                placeholder="Miscellaneous Expense Voucher: {invoice_no}"
                value={settings.defaultEmailSubject || ''}
                onChange={(e) => setSettings({...settings, defaultEmailSubject: e.target.value})}
              />
              <p className="text-xs text-text-muted">You can use <code className="bg-bg-base px-1 py-0.5 rounded text-accent-600">{"{invoice_no}"}</code> to auto-inject the invoice number.</p>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-text-base">Default Message</label>
              <textarea 
                className="w-full px-3 py-2 bg-bg-base border border-border-subtle rounded-lg text-text-base focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition-shadow outline-none resize-y min-h-[100px]"
                placeholder="Please find attached the miscellaneous expense voucher..."
                value={settings.defaultEmailBody || ''}
                onChange={(e) => setSettings({...settings, defaultEmailBody: e.target.value})}
              />
            </div>
          </div>
        </div>

        {/* Branding & Export Settings Section */}"""
    content = content.replace(old_branding, new_email)
    
    # Import Mail if not imported
    if "Mail" not in content:
         content = content.replace("Settings2, Save", "Settings2, Save, Mail")
         
    with open(settings_path, 'w') as f:
        f.write(content)

