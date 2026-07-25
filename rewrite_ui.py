import re

with open("frontend/src/components/dashboard/TableManager.tsx", "r") as f:
    text = f.read()

# Add User, ReceiptText, Trash2 if missing
imports_line_start = text.find("import { Loader2")
if "User," not in text[imports_line_start:imports_line_start+200]:
    text = text.replace("import { Loader2", "import { User, ReceiptText, Trash2, Loader2")

start_idx = text.find("return (\n                <motion.div\n                  layout\n                  key={table.id}")
end_idx = text.find("</motion.div>\n              );\n            })}\n          </div>", start_idx) + len("</motion.div>")

new_jsx = """return (
                <motion.div
                  layout
                  key={table.id}
                  className={`relative p-5 rounded-[18px] border bg-card flex flex-col transition-all duration-200 min-h-[220px] ${
                    isTableEditing 
                      ? 'border-amber-400 shadow-[0_4px_16px_rgba(251,191,36,0.2)] ring-2 ring-amber-400/50' 
                      : 'border-border shadow-sm hover:shadow-md'
                  }`}
                >
                  {isTableEditing && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-3 py-1 rounded-full text-[10px] font-black shadow-lg animate-bounce flex items-center gap-1 z-10 whitespace-nowrap">
                      <Loader2 size={10} className="animate-spin" />
                      CUSTOMER EDITING
                    </div>
                  )}

                  {/* Header Row 1: Table Number & Menu */}
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-extrabold text-2xl text-foreground leading-none">{table.tableNumber}</h3>
                    {session && (
                      <DropdownMenu>
                        <DropdownMenuTrigger className="p-1 -mr-2 -mt-1 hover:bg-muted rounded-md transition text-muted-foreground outline-none">
                          <MoreVertical size={20} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg">
                          {(user.role === 'admin' || user.permissions?.canTransferTable) && (
                            <DropdownMenuItem
                              onClick={() => setTransferTableState({ sessionId: session.id, number: table.tableNumber })}
                              className="gap-2 cursor-pointer font-medium"
                            >
                              <ArrowLeftRight size={16} className="text-muted-foreground" />
                              <span>Transfer Table</span>
                            </DropdownMenuItem>
                          )}
                          {(user.role === 'admin' || user.permissions?.canClearTable) && (
                            <DropdownMenuItem
                              onClick={() => handleClearTableClick(session.id, session.customerPhone)}
                              disabled={closingId === session.id}
                              className="gap-2 text-destructive focus:text-destructive cursor-pointer md:hidden font-bold"
                            >
                              <Trash2 size={16} />
                              <span>Clear Table</span>
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  {/* Header Row 2: Timer & Status */}
                  <div className="flex justify-between items-center mb-4 min-h-[28px]">
                    {elapsedString ? (
                      <span className="px-3 py-1 text-xs font-semibold rounded-lg border border-border text-foreground flex items-center gap-1.5 shadow-sm">
                        <Clock size={14} className="text-muted-foreground" /> {elapsedString}
                      </span>
                    ) : <div></div>}
                    
                    {(() => {
                      let bg = "bg-muted"; let textClr = "text-muted-foreground"; let dot = "bg-muted-foreground";
                      let label = table.status.charAt(0).toUpperCase() + table.status.slice(1);

                      if (session?.status === 'billing') {
                        bg = "bg-purple-100 dark:bg-purple-900/30"; textClr = "text-purple-700 dark:text-purple-400"; dot = "bg-purple-600 dark:bg-purple-500";
                        label = "Billing";
                      } else if (table.status === 'occupied') {
                        bg = "bg-emerald-100 dark:bg-emerald-900/30"; textClr = "text-emerald-700 dark:text-emerald-400"; dot = "bg-emerald-600 dark:bg-emerald-500";
                      } else if (table.status === 'reserved') {
                        bg = "bg-amber-100 dark:bg-amber-900/30"; textClr = "text-amber-700 dark:text-amber-400"; dot = "bg-amber-600 dark:bg-amber-500";
                      } else {
                        bg = "bg-gray-100 dark:bg-gray-800"; textClr = "text-gray-600 dark:text-gray-300"; dot = "bg-gray-400 dark:bg-gray-500";
                      }
                      
                      return (
                        <span className={`px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 ${bg} ${textClr}`}>
                          <div className={`w-2 h-2 rounded-full ${dot}`}></div>
                          {label}
                        </span>
                      );
                    })()}
                  </div>

                  <hr className="border-border/60 mb-5" />

                  {/* Body Section */}
                  {!session && table.status === 'available' && (
                    <div className="flex-1 flex flex-col justify-end gap-5">
                      <div className="flex-1 flex items-center justify-center">
                        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                          <UtensilsCrossed size={24} className="text-muted-foreground/50" />
                        </div>
                      </div>
                      <button
                        onClick={() => setOpenTableState({ id: table.id, number: table.tableNumber })}
                        className="w-full h-12 bg-transparent hover:bg-muted border border-border text-foreground rounded-xl text-sm font-bold transition-all active:scale-95 shadow-sm flex items-center justify-center gap-2"
                      >
                        <UtensilsCrossed size={18} /> Open Table
                      </button>
                    </div>
                  )}

                  {session && (
                    <div className="flex-1 flex flex-col justify-between">
                      {/* Price Section */}
                      <div className="mb-5">
                        {billsMap[session.id] ? (
                          <>
                            <h2 className="text-[32px] font-black text-foreground leading-tight tracking-tight">
                              ₹{billsMap[session.id].totalAmount.toFixed(0)}
                            </h2>
                            <p className="text-sm font-medium text-muted-foreground mt-0.5">Bill Total</p>
                          </>
                        ) : (
                          <>
                            <h2 className="text-[32px] font-black text-foreground leading-tight tracking-tight">₹0</h2>
                            <p className="text-sm font-medium text-muted-foreground mt-0.5">Bill Total</p>
                          </>
                        )}
                      </div>

                      {/* Guest Badge */}
                      <div className="mb-5">
                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-300 font-bold text-sm">
                          <User size={16} className="text-blue-600 dark:text-blue-400" />
                          <span className="truncate max-w-[120px]">{session.customerName || "Guest"}</span>
                        </span>
                        {session.customerPhone && session.customerPhone !== "0000000000" && (
                          <p className="text-[10px] font-semibold text-muted-foreground mt-1.5 ml-2">{session.customerPhone}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-4 mt-auto">
                        {session.status === 'billing' ? (
                          <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800 rounded-xl p-4 text-center">
                            <p className="text-sm font-bold text-purple-700 dark:text-purple-400 mb-1">Customer is Done</p>
                            <p className="text-xs text-purple-600/70 dark:text-purple-400/70 mb-4 font-medium">Please collect payment to free this table.</p>
                            {(user.role === 'admin' || user.permissions?.canClearTable) && (
                              <button
                                onClick={() => handleClearTableClick(session.id, session.customerPhone)}
                                disabled={closingId === session.id}
                                className="w-full bg-purple-600 text-white h-12 flex items-center justify-center gap-2 rounded-xl text-sm font-bold shadow-md shadow-purple-500/20 hover:bg-purple-700 transition active:scale-95 disabled:opacity-50"
                              >
                                {closingId === session.id ? <Loader2 className="animate-spin w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                                Clear Table
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex gap-3">
                            <button
                              onClick={() => setOrderTableState({ sessionId: session.id, number: table.tableNumber, customerName: session.customerName, customerPhone: session.customerPhone })}
                              className="flex-[1.2] bg-amber-500 hover:bg-amber-600 text-black h-12 flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-sm"
                            >
                              <Plus size={18} /> Add Items
                            </button>
                            <button
                              onClick={() => setSelectedTable(table)}
                              className="flex-1 bg-transparent hover:bg-muted border border-border text-foreground h-12 flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all active:scale-95"
                            >
                              <ReceiptText size={18} className="text-muted-foreground" /> View Bill
                            </button>
                          </div>
                        )}

                        {/* Danger Action */}
                        {(user.role === 'admin' || user.permissions?.canClearTable) && session.status !== 'billing' && (
                          <div className="hidden md:block">
                            <hr className="border-border/60 mb-4" />
                            <button
                              onClick={() => handleClearTableClick(session.id, session.customerPhone)}
                              disabled={closingId === session.id}
                              className="w-full h-12 border border-destructive/50 text-destructive bg-transparent hover:bg-destructive/10 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors active:scale-95 disabled:opacity-50"
                            >
                              {closingId === session.id ? <Loader2 className="animate-spin w-5 h-5" /> : <Trash2 size={18} />}
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
