/**
 * File Upload Hook
 */

import { useState, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { supplierFileApi } from '../api'
import { getErrorMessage } from '../errors'
import { validateFileSize, validateFileType, FILE_TYPES, MAX_FILE_SIZE } from '../utils'

interface UploadedFile {
  url: string
  filename: string
}

/**
 * Hook for file uploads
 */
export function useFileUpload() {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null)

  const uploadFile = useCallback(
    async (file: File, type: 'document' | 'image' = 'document'): Promise<UploadedFile | null> => {
      // Validate file size (10MB limit)
      if (!validateFileSize(file, MAX_FILE_SIZE)) {
        toast.error('檔案大小不能超過 10MB')
        return null
      }

      // Validate file type
      const allowedTypes = type === 'image' ? FILE_TYPES.image : FILE_TYPES.document
      if (!validateFileType(file, allowedTypes)) {
        toast.error('不支援的檔案格式')
        return null
      }

      setUploading(true)
      setError(null)

      try {
        const result = await supplierFileApi.uploadFile(file, type)
        setUploadedFile(result)
        toast.success('檔案上傳成功')
        return result
      } catch (err) {
        const errorMessage = getErrorMessage(err)
        setError(errorMessage)
        toast.error(errorMessage)
        return null
      } finally {
        setUploading(false)
      }
    },
    []
  )

  const reset = useCallback(() => {
    setUploadedFile(null)
    setError(null)
  }, [])

  return {
    uploadFile,
    uploading,
    error,
    uploadedFile,
    reset,
  }
}
