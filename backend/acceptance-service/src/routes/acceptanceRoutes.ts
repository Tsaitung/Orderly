import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import {
  getAcceptanceRecords,
  getAcceptanceRecordById,
  createAcceptanceRecord,
  updateAcceptanceRecord,
  completeAcceptance,
  uploadPhoto,
  getAcceptanceByOrderId
} from '../controllers/acceptanceController';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req: any, file: any, cb: any) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// Routes
router.get('/', getAcceptanceRecords);
router.get('/:id', getAcceptanceRecordById);
router.post('/', createAcceptanceRecord);
router.put('/:id', updateAcceptanceRecord);
router.put('/:id/complete', completeAcceptance);
router.get('/order/:orderId', getAcceptanceByOrderId);
router.post('/upload-photo', upload.single('file'), uploadPhoto);

export default router;