export interface ImportResponse {
  ok: boolean
  importId?: string
  stats?: {
    totalRows: number
    importedRows: number
    errors: number
  }
  error?: string
  details?: string
}

export interface YearDataResponse {
  ok: boolean
  year: number
  totalEmployees: number
  totalAttendanceEvents: number
  totalShifts: number
  employees: EmployeeData[]
  summary: {
    employeesByDepartment: Record<string, number>
    shiftsByType: Record<string, number>
  }
  error?: string
  details?: string
}

export interface EmployeeData {
  employeeId: string
  name: string
  department?: string
  position?: string
  email?: string
  attendanceEvents: AttendanceEvent[]
  shifts: ShiftData[]
}

export interface AttendanceEvent {
  date: string
  checkIn?: string
  checkOut?: string
  eventType: 'check_in' | 'check_out' | 'break_start' | 'break_end'
}

export interface ShiftData {
  date: string
  shiftType: 'morning' | 'afternoon' | 'night' | 'custom'
  startTime: string
  endTime: string
  duration: number
}
