import { MongoClient, Db, Collection } from 'mongodb'

let cachedClient: MongoClient | null = null
let cachedDb: Db | null = null

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable')
}

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb }
  }

  try {
    const client = new MongoClient(MONGODB_URI)
    await client.connect()
    const db = client.db('xls-import-db')

    cachedClient = client
    cachedDb = db

    return { client, db }
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error)
    throw new Error('Database connection failed')
  }
}

export interface ImportRecord {
  _id?: string
  importId: string
  filename: string
  uploadedAt: Date
  stats: {
    totalRows: number
    importedRows: number
    errors: number
  }
  status: 'processing' | 'completed' | 'error'
  error?: string
}

export interface Employee {
  _id?: string
  importId: string
  employeeId: string
  name: string
  department?: string
  position?: string
  email?: string
  createdAt: Date
}

export interface AttendanceEvent {
  _id?: string
  importId: string
  employeeId: string
  date: Date
  checkIn?: Date
  checkOut?: Date
  breakDuration?: number
  hoursWorked?: number
  eventType: 'check_in' | 'check_out' | 'break_start' | 'break_end'
  createdAt: Date
}

export interface Shift {
  _id?: string
  importId: string
  employeeId: string
  date: Date
  shiftType: 'morning' | 'afternoon' | 'night' | 'custom'
  startTime: string
  endTime: string
  duration: number
  createdAt: Date
}

export async function getCollection<T>(name: string): Promise<Collection<T>> {
  const { db } = await connectToDatabase()
  return db.collection<T>(name)
}
