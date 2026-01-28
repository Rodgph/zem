import React, { useState } from 'react'
import XlsImport from './components/XlsImport'
import { YearDataResponse } from './types'

function App() {
  const [yearData, setYearData] = useState<YearDataResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchYearData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/year/2026')
      const data: YearDataResponse = await response.json()
      setYearData(data)
    } catch (error) {
      console.error('Error fetching year data:', error)
      setYearData({
        ok: false,
        year: 2026,
        totalEmployees: 0,
        totalAttendanceEvents: 0,
        totalShifts: 0,
        employees: [],
        summary: { employeesByDepartment: {}, shiftsByType: {} },
        error: 'Failed to fetch data'
      })
    } finally {
      setLoading(false)
    }
  }

  const downloadTypeScriptExport = async () => {
    try {
      const response = await fetch('/api/exports/year2026.ts')
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'year2026-data.ts'
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error downloading TypeScript export:', error)
    }
  }

  return (
    <div>
      <h1>XLS Import MongoDB</h1>
      
      <XlsImport />
      
      <div className="card">
        <h2>Dados de 2026</h2>
        
        <div style={{ marginBottom: '1rem' }}>
          <button onClick={fetchYearData} disabled={loading}>
            {loading ? 'Carregando...' : 'Carregar Dados'}
          </button>
          
          <button 
            onClick={downloadTypeScriptExport}
            style={{ marginLeft: '0.5rem' }}
          >
            Baixar Export TypeScript
          </button>
        </div>

        {yearData && (
          <div>
            {yearData.ok ? (
              <div>
                <h3>Resumo</h3>
                <div style={{ textAlign: 'left', marginBottom: '1rem' }}>
                  <p><strong>Total de Funcionários:</strong> {yearData.totalEmployees}</p>
                  <p><strong>Total de Eventos:</strong> {yearData.totalAttendanceEvents}</p>
                  <p><strong>Total de Turnos:</strong> {yearData.totalShifts}</p>
                </div>

                <h4>Funcionários por Departamento</h4>
                <div style={{ textAlign: 'left', marginBottom: '1rem' }}>
                  {Object.entries(yearData.summary.employeesByDepartment).map(([dept, count]) => (
                    <p key={dept}>• {dept}: {count}</p>
                  ))}
                </div>

                <h4>Turnos por Tipo</h4>
                <div style={{ textAlign: 'left' }}>
                  {Object.entries(yearData.summary.shiftsByType).map(([type, count]) => (
                    <p key={type}>• {type}: {count}</p>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ color: '#ff6b6b' }}>
                <p><strong>Erro:</strong> {yearData.error}</p>
                {yearData.details && <p><strong>Detalhes:</strong> {yearData.details}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
