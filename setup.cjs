const fs = require('fs')

// Fix Kiosk.tsx
let kiosk = fs.readFileSync('src/pages/Kiosk.tsx', 'utf8')
kiosk = kiosk.replace('const [lastScore, setLastScore]', 'const [lastScore, _setLastScore]')
fs.writeFileSync('src/pages/Kiosk.tsx', kiosk)
console.log('fixed Kiosk')

// Fix Locations.tsx
let loc = fs.readFileSync('src/pages/Locations.tsx', 'utf8')
loc = loc.replace('  const selectedStore = STORES.find(s => s.id === selected)', '  // selectedStore used inline via selected state')
fs.writeFileSync('src/pages/Locations.tsx', loc)
console.log('fixed Locations')

// Fix Reports.tsx
let rep = fs.readFileSync('src/pages/Reports.tsx', 'utf8')
rep = rep.replace("import { Download, TrendingUp, TrendingDown } from 'lucide-react'", "import { Download } from 'lucide-react'")
rep = rep.replace("  const [store, setStore] = useState('all')", "  // store filter coming soon")
fs.writeFileSync('src/pages/Reports.tsx', rep)
console.log('fixed Reports')

console.log('All fixes applied!')
