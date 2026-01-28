import { VercelRequest, VercelResponse } from '@vercel/node'
import { getCollection, Employee, AttendanceEvent, Shift } from '../../server/db'

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
      getCollection<Employee>('employees')
        .find({ createdAt: { $gte: startDate, $lte: endDate } })
        .toArray(),
      getCollection<AttendanceEvent>('attendance_events')
        .find({ createdAt: { $gte: startDate, $lte: endDate } })
        .toArray(),
      getCollection<Shift>('shifts')
        .find({ createdAt: { $gte: startDate, $lte: endDate } })
        .toArray()
    ])

    // Agrupar dados por funcionário
    const employeeMap = new Map()
    employees.forEach(emp => {
      employeeMap.set(emp.employeeId, {
        employeeId: emp.employeeId,
        name: emp.name,
        department: emp.department,
        position: emp.position,
        email: emp.email,
        attendanceEvents: [],
        shifts: []
      })
    })

    // Adicionar eventos de attendance
    attendanceEvents.forEach(event => {
      const employee = employeeMap.get(event.employeeId)
      if (employee) {
        employee.attendanceEvents.push({
          date: event.date,
          checkIn: event.checkIn,
          checkOut: event.checkOut,
          eventType: event.eventType
        })
      }
    })

    // Adicionar shifts
    shifts.forEach(shift => {
      const employee = employeeMap.get(shift.employeeId)
      if (employee) {
        employee.shifts.push({
          date: shift.date,
          shiftType: shift.shiftType,
          startTime: shift.startTime,
          endTime: shift.endTime,
          duration: shift.duration
        })
      }
    })

    const result = {
      ok: true,
      year,
      totalEmployees: employees.length,
      totalAttendanceEvents: attendanceEvents.length,
      totalShifts: shifts.length,
      employees: Array.from(employeeMap.values()),
      summary: {
        employeesByDepartment: employees.reduce((acc, emp) => {
          const dept = emp.department || 'Não especificado'
          acc[dept] = (acc[dept] || 0) + 1
          return acc
        }, {} as Record<string, number>),
        shiftsByType: shifts.reduce((acc, shift) => {
          acc[shift.shiftType] = (acc[shift.shiftType] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      }
    }

    res.status(200).json(result)

  } catch (error) {
    console.error('Error fetching year data:', error)
    res.status(500).json({ 
      ok: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
