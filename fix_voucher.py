with open('src/pages/Voucher.tsx', 'r') as f:
    content = f.read()

old_sig = """        {/* Signature Section */}
        <div className="mt-8">
          <div className="grid grid-cols-3 gap-8 text-sm text-center text-black">
            <div>
              <div className="border-t border-black pt-2 mb-1">Receiver</div>
              <p className="font-bold">{receivedBy?.name || '_________________'}</p>
              <p className="text-xs text-gray-600">{receivedBy?.designation || 'Sign & Date'}</p>
            </div>
            <div>
              <div className="border-t border-black pt-2 mb-1">Verified By</div>
              <p className="font-bold">{verifiedBy?.name || '_________________'}</p>
              <p className="text-xs text-gray-600">{verifiedBy?.designation || 'Finance Dept.'}</p>
            </div>
            <div>
              <div className="border-t border-black pt-2 mb-1">Approved By</div>
              <p className="font-bold">{approvedBy?.name || (invoice.status === 'Approved' ? 'Approved & Authorized' : '_________________')}</p>
              <p className="text-xs text-gray-600">{approvedBy?.designation || 'Authorized Signatory'}</p>
            </div>
          </div>
        </div>"""

new_sig = """        {/* Signature Section */}
        <div className="mt-16 flex justify-end">
          <div className="w-1/3 text-sm text-center text-black">
            <div className="border-t-2 border-black pt-2 mb-1 font-bold">Authorized Approval</div>
            <p className="font-bold">{approvedBy?.name || (invoice.status === 'Approved' ? 'Approved & Authorized' : '_________________')}</p>
            <p className="text-xs text-gray-600">{approvedBy?.designation || 'Authorized Signatory'}</p>
          </div>
        </div>"""

content = content.replace(old_sig, new_sig)

with open('src/pages/Voucher.tsx', 'w') as f:
    f.write(content)
