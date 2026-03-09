export interface Location {
  id: string
  name: string
  address: string
  city: string
  state: string
  storeCode: string
  region: string
}

export interface Grade {
  id: string
  locationId: string
  locationName: string
  workerId: string
  workerName: string
  photoUrl?: string
  scores: {
    crust: number
    cheese: number
    sauce: number
    toppings: number
    cut: number
    overall: number
  }
  aiScore: number
  workerScore: number
  pizzaStyle: string
  orderType: 'carryout' | 'delivery' | 'dine-in'
  status: 'pending' | 'scored' | 'flagged'
  createdAt: string
  notes?: string
}

export interface DailySummary {
  locationId: string
  locationName: string
  date: string
  totalGrades: number
  avgAiScore: number
  avgWorkerScore: number
  flaggedCount: number
  wtdAvg: number
}

export interface Alert {
  id: string
  locationId: string
  locationName: string
  message: string
  severity: 'low' | 'medium' | 'high'
  createdAt: string
  resolved: boolean
}