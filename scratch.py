with open("frontend/src/components/dashboard/TableManager.tsx", "r") as f:
    text = f.read()
    
start_idx = text.find("return (\n                <motion.div\n                  layout\n                  key={table.id}")
if start_idx == -1: print("Start not found")
else: print("Start found at", start_idx)

end_idx = text.find("</motion.div>\n              );\n            })}\n          </div>", start_idx)
if end_idx == -1: print("End not found")
else: print("End found at", end_idx)
