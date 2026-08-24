import re

def fix_print_in_file(filepath, container_ref_name):
    with open(filepath, 'r') as f:
        content = f.read()
    
    old_print = """  const handlePrint = () => {
    window.print();
  };"""
  
    new_print = f"""  const handlePrint = () => {{
    if (!{container_ref_name}.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {{
      alert('Please allow popups to print vouchers.');
      return;
    }}
    
    // Get the Tailwind styles and fonts if possible, or just inject basic print styles
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Vouchers</title>
          <style>
            @page {{ size: A4 portrait; margin: 0; }}
            body {{ font-family: 'Arial', sans-serif; color: #000; margin: 0; padding: 0; background: #fff; }}
            * {{ box-sizing: border-box; }}
            .print-container {{ padding: 20px; }}
            /* Injecting Tailwind-like utility classes that are used */
            .flex {{ display: flex; }} .justify-between {{ justify-content: space-between; }} .items-center {{ align-items: center; }}
            .text-center {{ text-align: center; }} .text-right {{ text-align: right; }} .text-left {{ text-align: left; }}
            .font-bold {{ font-weight: bold; }} .font-semibold {{ font-weight: 600; }} .font-medium {{ font-weight: 500; }}
            .text-sm {{ font-size: 14px; }} .text-xs {{ font-size: 12px; }} .text-lg {{ font-size: 18px; }} .text-xl {{ font-size: 20px; }} .text-2xl {{ font-size: 24px; }}
            .mb-2 {{ margin-bottom: 8px; }} .mb-4 {{ margin-bottom: 16px; }} .mb-6 {{ margin-bottom: 24px; }} .mb-8 {{ margin-bottom: 32px; }}
            .mt-2 {{ margin-top: 8px; }} .mt-4 {{ margin-top: 16px; }} .mt-8 {{ margin-top: 32px; }} .mt-16 {{ margin-top: 64px; }}
            .p-4 {{ padding: 16px; }} .px-4 {{ padding-left: 16px; padding-right: 16px; }} .py-2 {{ padding-top: 8px; padding-bottom: 8px; }}
            .border {{ border: 1px solid #000; }} .border-b-2 {{ border-bottom: 2px solid #000; }} .border-t-2 {{ border-top: 2px solid #000; }}
            .border-collapse {{ border-collapse: collapse; }}
            .w-full {{ width: 100%; }} .w-10 {{ width: 40px; }} .h-10 {{ height: 40px; }} .w-1\\/3 {{ width: 33.333%; }}
            .grid {{ display: grid; }} .grid-cols-2 {{ grid-template-columns: repeat(2, minmax(0, 1fr)); }} .gap-4 {{ gap: 16px; }} .gap-8 {{ gap: 32px; }}
            .bg-gray-50 {{ background-color: #f9fafb; }} .bg-gray-100 {{ background-color: #f3f4f6; }} .bg-black {{ background-color: #000; color: #fff; }}
            .uppercase {{ text-transform: uppercase; }} .tracking-wide {{ letter-spacing: 0.025em; }} .tracking-wider {{ letter-spacing: 0.05em; }} .tracking-widest {{ letter-spacing: 0.1em; }}
            table th, table td {{ border: 1px solid #000; padding: 8px; }}
            .inline-block {{ display: inline-block; }}
            .page-break {{ page-break-after: always; }}
          </style>
        </head>
        <body>
          ${{{container_ref_name}.current.innerHTML}}
          <script>
            window.onload = () => {{
              window.print();
              setTimeout(() => window.close(), 500);
            }};
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }};"""
    
    content = content.replace(old_print, new_print)
    
    with open(filepath, 'w') as f:
        f.write(content)

fix_print_in_file('src/components/BulkPrintModal.tsx', 'printContainerRef')
fix_print_in_file('src/components/PrintPreviewModal.tsx', 'printContainerRef')
