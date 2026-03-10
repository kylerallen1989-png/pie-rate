const fs = require('fs')
let login = fs.readFileSync('src/pages/Login.tsx', 'utf8')
login = login.replace(
  "  const [mode, setMode] = useState<'manager' | 'store'>('manager')",
  "  const [mode, setMode] = useState<'manager' | 'store'>('manager')\n  const switchMode = (m: 'manager' | 'store') => { setMode(m); setEmail(''); setStoreId(''); setPassword(''); setError('') }"
)
login = login.replace(
  "onClick={() => setMode('manager')}",
  "onClick={() => switchMode('manager')}"
)
login = login.replace(
  "onClick={() => setMode('store')}",
  "onClick={() => switchMode('store')}"
)
fs.writeFileSync('src/pages/Login.tsx', login)
console.log('fixed Login.tsx')