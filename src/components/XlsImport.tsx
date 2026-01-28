import React, { useState, useRef } from 'react'
import { ImportResponse } from '../types'

const XlsImport: React.FC = () => {
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<ImportResponse | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (file: File) => {
    if (!file) return

    // Validar tipo do arquivo
    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]

    if (!allowedTypes.includes(file.type)) {
      setResult({
        ok: false,
        error: 'Tipo de arquivo inválido. Apenas arquivos .xls e .xlsx são permitidos.'
      })
      return
    }

    // Validar tamanho (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setResult({
        ok: false,
        error: 'Arquivo muito grande. Tamanho máximo permitido: 10MB'
      })
      return
    }

    setUploading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/import-xls', {
        method: 'POST',
        body: formData,
        headers: {
          'x-import-key': import.meta.env.VITE_IMPORT_KEY || 'dev-key'
        }
      })

      const data: ImportResponse = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        ok: false,
        error: 'Erro ao fazer upload do arquivo',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0])
    }
  }

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="card">
      <h2>Importar Arquivo XLS/XLSX</h2>
      
      <div
        className={`upload-area ${dragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
        style={{
          border: `2px dashed ${dragActive ? '#646cff' : '#666'}`,
          borderRadius: '8px',
          padding: '2rem',
          margin: '1rem 0',
          cursor: 'pointer',
          textAlign: 'center',
          backgroundColor: dragActive ? '#2a2a2a' : '#1a1a1a'
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xls,.xlsx"
          onChange={handleFileSelect}
          disabled={uploading}
        />
        
        {uploading ? (
          <div>
            <p>Fazendo upload...</p>
            <div style={{ marginTop: '1rem' }}>
              <div 
                style={{
                  width: '100%',
                  height: '4px',
                  backgroundColor: '#333',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}
              >
                <div 
                  style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#646cff',
                    animation: 'pulse 1.5s ease-in-out infinite'
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div>
            <p>Arraste um arquivo XLS/XLSX aqui ou clique para selecionar</p>
            <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>
              Tamanho máximo: 10MB • Formatos: .xls, .xlsx
            </p>
          </div>
        )}
      </div>

      {result && (
        <div 
          className={`result ${result.ok ? 'success' : 'error'}`}
          style={{
            marginTop: '1rem',
            padding: '1rem',
            borderRadius: '8px',
            backgroundColor: result.ok ? '#1a3d1a' : '#3d1a1a',
            border: `1px solid ${result.ok ? '#4a7c4a' : '#7c4a4a'}`
          }}
        >
          <h3 style={{ margin: '0 0 0.5rem 0', color: result.ok ? '#4a7c4a' : '#7c4a4a' }}>
            {result.ok ? '✅ Importação concluída' : '❌ Erro na importação'}
          </h3>
          
          {result.ok && result.stats && (
            <div style={{ textAlign: 'left' }}>
              <p><strong>ID da Importação:</strong> {result.importId}</p>
              <p><strong>Total de Linhas:</strong> {result.stats.totalRows}</p>
              <p><strong>Linhas Importadas:</strong> {result.stats.importedRows}</p>
              <p><strong>Erros:</strong> {result.stats.errors}</p>
            </div>
          )}
          
          {result.error && (
            <div>
              <p><strong>Erro:</strong> {result.error}</p>
              {result.details && (
                <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                  <strong>Detalhes:</strong> {result.details}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export default XlsImport
