import { VercelRequest, VercelResponse } from '@vercel/node'
import multer from 'multer'
import { createReadStream } from 'fs'
import * as XLSX from 'xlsx'
import { randomUUID } from 'crypto'
import { 
  connectToDatabase, 
  getCollection, 
  ImportRecord, 
  Employee, 
  AttendanceEvent, 
  Shift 
} from '../../server/db'

const storage = multer.memoryStorage()
const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Apenas arquivos .xls e .xlsx são permitidos'))
    }
  }
})

export const config = {
  api: {
    bodyParser: false,
  },
}

function runMiddleware(req: any, res: any, fn: any) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result)
      }
      return resolve(result)
    })
  })
}

function normalizeXLSData(data: any[]): {
  employees: Employee[]
  attendanceEvents: AttendanceEvent[]
  shifts: Shift[]
} {
  const employees: Employee[] = []
  const attendanceEvents: AttendanceEvent[] = []
  const shifts: Shift[] = []
  const importId = randomUUID()
  const now = new Date()

  data.forEach((row, index) => {
    try {
      // Normalização de dados - adaptar conforme estrutura real do XLS
      const employeeId = String(row['ID'] || row['employeeId'] || row['Código'] || index)
      const name = String(row['Nome'] || row['name'] || row['Funcionário'] || `Funcionário ${employeeId}`)
      const department = row['Departamento'] || row['department'] || undefined
      const position = row['Cargo'] || row['position'] || undefined
      const email = row['Email'] || row['email'] || undefined
      const date = new Date(row['Data'] || row['date'] || now)
      const checkIn = row['Entrada'] || row['checkIn'] ? new Date(row['Entrada'] || row['checkIn']) : undefined
      const checkOut = row['Saída'] || row['checkOut'] ? new Date(row['Saída'] || row['checkOut']) : undefined
      const shiftType = (row['Turno'] || row['shift'] || 'custom') as 'morning' | 'afternoon' | 'night' | 'custom'
      const startTime = String(row['Hora Início'] || row['startTime'] || '08:00')
      const endTime = String(row['Hora Fim'] || row['endTime'] || '17:00')

      // Criar funcionário se não existir
      if (!employees.find(e => e.employeeId === employeeId)) {
        employees.push({
          importId,
          employeeId,
          name,
          department,
          position,
          email,
          createdAt: now
        })
      }

      // Criar evento de attendance
      if (checkIn) {
        attendanceEvents.push({
          importId,
          employeeId,
          date,
          checkIn,
          eventType: 'check_in',
          createdAt: now
        })
      }

      if (checkOut) {
        attendanceEvents.push({
          importId,
          employeeId,
          date,
          checkOut,
          eventType: 'check_out',
          createdAt: now
        })
      }

      // Criar shift
      const startHour = parseInt(startTime.split(':')[0])
      const endHour = parseInt(endTime.split(':')[0])
      const duration = endHour > startHour ? endHour - startHour : (24 - startHour) + endHour

      shifts.push({
        importId,
        employeeId,
        date,
        shiftType,
        startTime,
        endTime,
        duration,
        createdAt: now
      })

    } catch (error) {
      console.error(`Erro ao normalizar linha ${index}:`, error)
    }
  })

  return { employees, attendanceEvents, shifts }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      ok: false, 
      error: 'Method not allowed' 
    })
  }

  // Validar header de autenticação
  const importKey = req.headers['x-import-key']
  if (!importKey || importKey !== process.env.VERCEL_IMPORT_KEY) {
    return res.status(401).json({ 
      ok: false, 
      error: 'Unauthorized - Invalid import key' 
    })
  }

  try {
    await runMiddleware(req, res, upload.single('file'))

    if (!req.file) {
      return res.status(400).json({ 
        ok: false, 
        error: 'No file uploaded' 
      })
    }

    // Parse XLS
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json(worksheet)

    if (!jsonData || jsonData.length === 0) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Empty or invalid XLS file' 
      })
    }

    // Normalizar dados
    const { employees, attendanceEvents, shifts } = normalizeXLSData(jsonData)
    const importId = employees[0]?.importId || randomUUID()

    // Salvar no MongoDB
    const importsCollection = await getCollection<ImportRecord>('imports')
    const employeesCollection = await getCollection<Employee>('employees')
    const attendanceCollection = await getCollection<AttendanceEvent>('attendance_events')
    const shiftsCollection = await getCollection<Shift>('shifts')

    // Criar registro de import
    const importRecord: ImportRecord = {
      importId,
      filename: req.file.originalname,
      uploadedAt: new Date(),
      stats: {
        totalRows: jsonData.length,
        importedRows: employees.length,
        errors: jsonData.length - employees.length
      },
      status: 'completed'
    }

    await Promise.all([
      importsCollection.insertOne(importRecord as any),
      employeesCollection.insertMany(employees as any),
      attendanceCollection.insertMany(attendanceEvents as any),
      shiftsCollection.insertMany(shifts as any)
    ])

    res.status(200).json({
      ok: true,
      importId,
      stats: importRecord.stats
    })

  } catch (error) {
    console.error('Import error:', error)
    res.status(500).json({ 
      ok: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
