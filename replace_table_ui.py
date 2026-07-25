import re

with open("frontend/src/components/dashboard/TableManager.tsx", "r") as f:
    text = f.read()

# 1. Add User and ReceiptText to lucide-react imports
if "User," not in text:
    text = text.replace("CheckCircle, UtensilsCrossed", "User, ReceiptText, CheckCircle, UtensilsCrossed")

# 2. Extract the block to replace.
# The block starts from: {tables.map(table => {
# To the end of the map: })}
# We will just find `<motion.div` and the closing `</motion.div>` in that map.

start_idx = text.find("return (\n                <motion.div\n                  layout\n                  key={table.id}")
if start_idx == -1:
    print("Could not find start index")
    exit(1)

end_idx = text.find("</motion.div>\n              );\n            })}\n          </div>", start_idx)
if end_idx == -1:
    print("Could not find end index")
    exit(1)

# Include the closing tag
end_idx += len("</motion.div>")

new_jsx = """return (
                <motion.div
                  layout
                  key={table.id}
                  className={`relative p-5 rounded-[18px] border bg-white flex flex-col transition-all duration-200 min-h-[220px] ${
                    isTableEditing 
                      ? 'border-amber-300 shadow-[0_4px_16px_rgba(251,191,36,0.15)] ring-2 ring-amber-400 ring-opacity-50' 
                      : 'border-gray-200 shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]'
                  }`}
                >
                  {isTableEditing && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-3 py-1 rounded-full text-[10px] font-black shadow-lg animate-bounce flex items-center gap-1 z-10 whitespace-nowrap">
                      <Loader2 size={10} className="animate-spin" />
                      CUSTOMER EDITING
                    </div>
                  )}

                  {/* Header Section */}
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex flex-col gap-1.5">
                      <h3 className="font-extrabold text-xl text-gray-900 leading-none">{table.tableNumber}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {elapsedString && (
                        <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-gray-100 text-gray-600 flex items-center gap-1.5 border border-gray-200">
                          <Clock size={12} /> {elapsedString}
                        </span>
                      )}
                      {session && (
                        <DropdownMenu>
                          <DropdownMenuTrigger className="p-1 hover:bg-gray-100 rounded-md transition text-gray-500 outline-none">
                            <MoreVertical size={16} />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg border-gray-200">
                            {(user.role === 'admin' || user.permissions?.canTransferTable) && (
                              <DropdownMenuItem
                                onClick={() => setTransferTableState({ sessionId: session.id, number: table.tableNumber })}
                                className="gap-2 cursor-pointer font-medium"
                              >
                                <ArrowLeftRight size={14} className="text-gray-500" />
                                <span>Transfer Table</span>
                              </DropdownMenuItem>
                            )}
                            {(user.role === 'admin' || user.permissions?.canClearTable) && (
                              <DropdownMenuItem
                                onClick={() => handleClearTableClick(session.id, session.customerPhone)}
                                disabled={closingId === session.id}
                                className="gap-2 text-red-600 focus:text-red-600 cursor-pointer md:hidden font-bold"
                              >
                                <X size={14} />
                                <span>Clear Table</span>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>

                  {/* Status Pill */}
                  <div className="mb-3">
                    {(() => {
                      let bgClass = "bg-gray-100";
                      let textClass = "text-gray-600";
                      let borderClass = "border-gray-200";
                      let label = table.status.toUpperCase();

                      if (session?.status === 'billing') {
                        bgClass = "bg-purple-100"; textClass = "text-purple-700"; borderClass = "border-purple-200";
                        label = "BILLING";
                      } else if (table.status === 'occupied') {
                        bgClass = "bg-emerald-100"; textClass = "text-emerald-700"; borderClass = "border-emerald-200";
                      } else if (table.status === 'reserved') {
                        bgClass = "bg-amber-100"; textClass = "text-amber-700"; borderClass = "border-amber-200";
                      }
                      
                      return (
                        <span className={`inline-flex items-center px-2 py-0.5 text-[10px] uppercase font-bold rounded-md border ${bgClass} ${textClass} ${borderClass}`}>
                          {label}
                        </span>
                      );
                    })()}
                  </div>

                  <hr className="border-gray-100 my-2" />

                  {/* Body Section */}
                  {!session && table.status === 'available' && (
                    <div className="flex-1 flex flex-col justify-end gap-4 mt-2">
                      <div className="flex-1 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center">
                          <UtensilsCrossed size={20} className="text-gray-300" />
                        </div>
                      </div>
                      <button
                        onClick={() => setOpenTableState({ id: table.id, number: table.tableNumber })}
                        className="w-full h-11 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-[0_2px_4px_rgba(0,0,0,0.02)] flex items-center justify-center gap-2"
                      >
                        <UtensilsCrossed size={16} /> Open Table
                      </button>
                    </div>
                  )}

                  {session && (
                    <div className="flex-1 flex flex-col justify-between mt-2">
                      {/* Guest & Bill Row */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100 shrink-0">
                            <User size={14} className="text-gray-500" />
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-sm font-bold text-gray-800 leading-tight truncate">
                              {session.customerName || "Guest"}
                            </p>
                            {session.customerPhone && session.customerPhone !== "0000000000" && (
                              <p className="text-[10px] font-semibold text-gray-400 mt-0.5 truncate">{session.customerPhone}</p>
                            )}
                          </div>
                        </div>

                        {billsMap[session.id] && (
                          <div className="text-right shrink-0 ml-2">
                            <p className="text-[9px] uppercase font-extrabold text-gray-400 tracking-wider mb-0.5">Bill Total</p>
                            <p className="text-[22px] font-black text-gray-900 leading-none">
                              ₹{billsMap[session.id].totalAmount.toFixed(0)}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-3 mt-auto">
                        {session.status === 'billing' ? (
                          <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-center">
                            <p className="text-sm font-bold text-purple-700 mb-1">Customer is Done</p>
                            <p className="text-[11px] text-purple-600/70 mb-3 font-medium">Please collect payment to free this table.</p>
                            {(user.role === 'admin' || user.permissions?.canClearTable) && (
                              <button
                                onClick={() => handleClearTableClick(session.id, session.customerPhone)}
                                disabled={closingId === session.id}
                                className="w-full bg-purple-600 text-white h-10 flex items-center justify-center gap-2 rounded-lg text-xs font-bold shadow-md shadow-purple-500/20 hover:bg-purple-700 transition active:scale-95 disabled:opacity-50"
                              >
                                {closingId === session.id ? <Loader2 className="animate-spin w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                Clear Table
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => setOrderTableState({ sessionId: session.id, number: table.tableNumber, customerName: session.customerName, customerPhone: session.customerPhone })}
                              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white h-11 flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-[0_4px_10px_rgba(245,158,11,0.2)]"
                            >
                              <Plus size={16} /> Add Items
                            </button>
                            <button
                              onClick={() => setSelectedTable(table)}
                              className="flex-1 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 h-11 flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-[0_2px_4px_rgba(0,0,0,0.02)]"
                            >
                              <ReceiptText size={16} /> View Bill
                            </button>
                          </div>
                        )}

                        {/* Danger Action */}
                        {(user.role === 'admin' || user.permissions?.canClearTable) && session.status !== 'billing' && (
                          <div className="hidden md:block">
                            <hr className="border-gray-100 mb-3" />
                            <button
                              onClick={() => handleClearTableClick(session.id, session.customerPhone)}
                              disabled={closingId === session.id}
                              className="w-full h-11 border border-red-200 text-red-600 bg-red-50/50 hover:bg-red-50 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors active:scale-95 disabled:opacity-50"
                            >
                              {closingId === session.id ? <Loader2 className="animate-spin w-4 h-4" /> : <X size={16} />}
                              Clear Table
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>"""

text = text[:start_idx] + new_jsx + text[end_idx:]

with open("frontend/src/components/dashboard/TableManager.tsx", "w") as f:
    f.write(text)
