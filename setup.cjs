const fs = require('fs')

// Fix AuthContext.tsx
let auth = fs.readFileSync('src/context/AuthContext.tsx', 'utf8')
auth = auth.replace("import { createContext, useContext, useState, ReactNode }", "import { createContext, useContext, useState } from 'react'\nimport type { ReactNode }")
auth = auth.replace("import { createContext, useContext, useState, ReactNode } from 'react'", "import { createContext, useContext, useState } from 'react'\nimport type { ReactNode } from 'react'")
fs.writeFileSync('src/context/AuthContext.tsx', auth)
console.log('fixed AuthContext')

// Fix AuditDashboard.tsx
let audit = fs.readFileSync('src/pages/AuditDashboard.tsx', 'utf8')
audit = audit.replace("import { useState } from 'react'\nimport { TrendingUp, TrendingDown, AlertTriangle, User } from 'lucide-react'", "import { useState } from 'react'\nimport { AlertTriangle, User } from 'lucide-react'")
audit = audit.replace("  const passRate = Math.round((passCount / AUDITS.length) * 100)", "  // passRate calculated but shown in future UI")
fs.writeFileSync('src/pages/AuditDashboard.tsx', audit)
console.log('fixed AuditDashboard')

// Fix CutTableDashboard.tsx
let cut = fs.readFileSync('src/pages/CutTableDashboard.tsx', 'utf8')
cut = cut.replace("import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'", "import { AlertTriangle } from 'lucide-react'")
fs.writeFileSync('src/pages/CutTableDashboard.tsx', cut)
console.log('fixed CutTableDashboard')

// Fix Grade.tsx
let grade = fs.readFileSync('src/pages/Grade.tsx', 'utf8')
grade = grade.replace("import { Camera, CheckCircle, AlertTriangle, ChevronRight } from 'lucide-react'", "import { Camera, CheckCircle, AlertTriangle } from 'lucide-react'")
grade = grade.replace("  const { user } = useAuth()\n", "  useAuth()\n")
grade = grade.replace("  const { user } = useAuth()", "  useAuth()")
fs.writeFileSync('src/pages/Grade.tsx', grade)
console.log('fixed Grade')

console.log('All fixes applied!')
