import { VercelRequest, VercelResponse } from '@vercel/node'
import { getCollection, Employee, AttendanceEvent, Shift } from '../../server/db'

function generateTypeScriptCode(employees: any[], attendanceEvents: any[], shifts: any[]): string {
  const timestamp = new Date().toISOString()
  
  return `// Generated TypeScript export for year 2026
// Generated at: ${timestamp}
// Total employees: ${employees.length}
// Total attendance events: ${attendanceEvents.length}
// Total shifts: ${shifts.length}

export interface EmployeeData {
  employeeId: string
  name: string
  department?: string
  position?: string
  email?: string
  createdAt: Date
}

export interface AttendanceEventData {
  employeeId: string
  date: Date
  checkIn?: Date
  checkOut?: Date
  eventType: 'check_in' | 'check_out' | 'break_start' | 'break_end'
  createdAt: Date
}

export interface ShiftData {
  employeeId: string
  date: Date
  shiftType: 'morning' | 'afternoon' | 'night' | 'custom'
  startTime: string
  endTime: string
  duration: number
  createdAt: Date
}

export const year2026Data = {
  metadata: {
    year: 2026,
    generatedAt: '${timestamp}',
    totalEmployees: ${employees.length},
    totalAttendanceEvents: ${attendanceEvents.length},
    totalShifts: ${shifts.length}
  },
  
  employees: ${JSON.stringify(employees, null, 2)} as EmployeeData[],
  
  attendanceEvents: ${JSON.stringify(attendanceEvents, null, 2)} as AttendanceEventData[],
  
  shifts: ${JSON.stringify(shifts, null, 2)} as ShiftData[],
  
  // Helper functions
  getEmployeeById: (employeeId: string) => {
    return year2026Data.employees.find(emp => emp.employeeId === employeeId)
  },
  
  getAttendanceByEmployee: (employeeId: string) => {
    return year2026Data.attendanceEvents.filter(event => event.employeeId === employeeId)
  },
  
  getShiftsByEmployee: (employeeId: string) => {
    return year2026Data.shifts.filter(shift => shift.employeeId === employeeId)
  },
  
  getEmployeesByDepartment: (department: string) => {
    return year2026Data.employees.filter(emp => emp.department === department)
  },
  
  getSummary: () => {
    const departments = year2026Data.employees.reduce((acc, emp) => {
      const dept = emp.department || 'Não especificado'
      acc[dept] = (acc[dept] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const shiftTypes = year2026Data.shifts.reduce((acc, shift) => {
      acc[shift.shiftType] = (acc[shift.shiftType] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return {
      departments,
      shiftTypes,
      averageShiftDuration: year2026Data.shifts.reduce((sum, shift) => sum + shift.duration, 0) / year2026Data.shifts.length || 0
    }
  }
}

export default year2026Data
`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      ok: false, 
      error: 'Method not allowed' 
    })
  }

  try {
    const year = 2026
    const startDate = new Date(`${year}-01-01T00:00:00.000Z`)
    const endDate = new Date(`${year}-12-31T23:59:59.999Z`)

    // Buscar dados das coleções
    const [employees, attendanceEvents, shifts] = await Promise.all([
      (await getCollection<Employee>('employees'))
        .find({ createdAt: { $gte: startDate, $lte: endDate } })
        .toArray(),
      (await getCollection<AttendanceEvent>('attendance_events'))
        .find({ createdAt: { $gte: startDate, $lte: endDate } })
        .toArray(),
      (await getCollection<Shift>('shifts'))
        .find({ createdAt: { $gte: startDate, $lte: endDate } })
        .toArray()
    ])

    // Gerar código TypeScript
    const tsCode = generateTypeScriptCode(employees, attendanceEvents, shifts)

    // Configurar headers para download
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="year2026-data.ts"`)
    
    res.status(200).send(tsCode)

  } catch (error) {
    console.error('Error generating TypeScript export:', error)
    res.status(500).json({ 
      ok: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
