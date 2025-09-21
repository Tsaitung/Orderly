'use client'

import React, { useState, useRef } from 'react'
import { AccessibleModal } from '@/components/ui/accessible-modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Product, ImageUploadRequest, ImageUploadResponse } from '@/lib/api/product-types'
import {
  Upload,
  X,
  Loader,
  Image as ImageIcon,
  Star,
  Trash2,
  Download,
  Eye,
  Move,
  AlertCircle,
  Check
} from 'lucide-react'

interface ProductImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onUpload: (productId: string, image: ImageUploadRequest) => Promise<ImageUploadResponse>;
  onDelete: (productId: string, imageId: string) => Promise<void>;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function ProductImageUploadModal({
  isOpen,
  onClose,
  product,
  onUpload,
  onDelete
}: ProductImageUploadModalProps) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [altTexts, setAltTexts] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const validFiles: File[] = [];
    const errors: string[] = [];

    Array.from(files).forEach(file => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`${file.name}: 不支援的檔案格式`);
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: 檔案大小超過 5MB`);
        return;
      }

      validFiles.push(file);
    });

    if (errors.length > 0) {
      alert(errors.join('\n'));
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  // Remove selected file
  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Handle alt text change
  const handleAltTextChange = (fileName: string, altText: string) => {
    setAltTexts(prev => ({ ...prev, [fileName]: altText }));
  };

  // Upload all selected files
  const handleUploadAll = async () => {
    if (!product || selectedFiles.length === 0) return;

    setUploading(true);
    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const altText = altTexts[file.name] || '';
        const isPrimary = i === 0 && product.images.length === 0; // First image as primary if no existing images

        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

        // Simulate upload progress
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            const current = prev[file.name] || 0;
            if (current >= 90) {
              clearInterval(progressInterval);
              return prev;
            }
            return { ...prev, [file.name]: current + 10 };
          });
        }, 200);

        await onUpload(product.id, {
          file,
          alt_text: altText,
          is_primary: isPrimary
        });

        clearInterval(progressInterval);
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
      }

      // Clear form after successful upload
      setSelectedFiles([]);
      setAltTexts({});
      setUploadProgress({});

    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  // Delete image
  const handleDeleteImage = async (imageId: string) => {
    if (!product) return;

    setDeleting(imageId);
    try {
      await onDelete(product.id, imageId);
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setDeleting(null);
    }
  };

  // Handle close
  const handleClose = () => {
    if (!uploading) {
      setSelectedFiles([]);
      setAltTexts({});
      setUploadProgress({});
      onClose();
    }
  };

  if (!product) return null;

  return (
    <AccessibleModal isOpen={isOpen} onClose={handleClose} title={`產品圖片管理 - ${product.name}`} size="xl" className="max-h-[90vh] overflow-y-auto">
      <div className="space-y-6">
          {/* Current Images */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">
              目前圖片 ({product.images.length})
            </h3>
            
            {product.images.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">尚未上傳任何圖片</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {product.images.map(image => (
                  <div key={image.id} className="relative group">
                    <div className="aspect-square bg-gray-100 border border-gray-200 rounded-lg overflow-hidden">
                      <img
                        src={image.url}
                        alt={image.alt_text || product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    {/* Image overlay */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded-lg flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 flex space-x-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteImage(image.id)}
                          disabled={deleting === image.id}
                          className="h-8 w-8 p-0"
                        >
                          {deleting === image.id ? (
                            <Loader className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Primary badge */}
                    {image.is_primary && (
                      <div className="absolute top-2 left-2">
                        <div className="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center">
                          <Star className="h-3 w-3 mr-1" />
                          主要
                        </div>
                      </div>
                    )}

                    {/* Alt text */}
                    <div className="mt-2">
                      <p className="text-xs text-gray-600 truncate">
                        {image.alt_text || '無描述'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upload Area */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">上傳新圖片</h3>
            
            {/* Drag and Drop Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragOver 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                拖拽圖片至此處或點擊選擇
              </p>
              <p className="text-sm text-gray-600 mb-4">
                支援 JPG、PNG、WebP 格式，最大 5MB
              </p>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                選擇檔案
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ALLOWED_TYPES.join(',')}
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
              />
            </div>
          </div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-900 mb-3">
                待上傳檔案 ({selectedFiles.length})
              </h3>
              
              <div className="space-y-3">
                {selectedFiles.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                    {/* File preview */}
                    <div className="w-16 h-16 bg-gray-100 border border-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* File info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      
                      {/* Alt text input */}
                      <div className="mt-2">
                        <Input
                          placeholder="圖片描述 (選填)"
                          value={altTexts[file.name] || ''}
                          onChange={(e) => handleAltTextChange(file.name, e.target.value)}
                          className="text-sm"
                          disabled={uploading}
                        />
                      </div>

                      {/* Upload progress */}
                      {uploadProgress[file.name] !== undefined && (
                        <div className="mt-2">
                          <div className="flex items-center space-x-2">
                            {uploadProgress[file.name] === 100 ? (
                              <>
                                <Check className="h-4 w-4 text-green-600" />
                                <span className="text-sm text-green-600">上傳完成</span>
                              </>
                            ) : (
                              <>
                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-blue-600 h-2 rounded-full transition-all"
                                    style={{ width: `${uploadProgress[file.name]}%` }}
                                  />
                                </div>
                                <span className="text-sm text-gray-600">
                                  {uploadProgress[file.name]}%
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Remove button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSelectedFile(index)}
                      disabled={uploading}
                      className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Upload all button */}
              <div className="flex justify-end mt-4">
                <Button
                  onClick={handleUploadAll}
                  disabled={uploading || selectedFiles.length === 0}
                >
                  {uploading ? (
                    <>
                      <Loader className="h-4 w-4 mr-2 animate-spin" />
                      上傳中...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      上傳所有檔案
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Guidelines */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">圖片上傳建議</h4>
                <ul className="text-sm text-blue-800 mt-2 space-y-1">
                  <li>• 建議使用高解析度圖片 (至少 800x800 像素)</li>
                  <li>• 第一張圖片將自動設為主要圖片</li>
                  <li>• 添加圖片描述有助於提高搜尋效果</li>
                  <li>• 主要圖片會在產品列表中顯示</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={uploading}
            >
              {uploading ? '上傳中...' : '關閉'}
            </Button>
          </div>
      </div>
    </AccessibleModal>
  );
}
