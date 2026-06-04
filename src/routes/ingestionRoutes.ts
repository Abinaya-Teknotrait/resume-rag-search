import { Router } from 'express';
import { upload } from '../config/multerConfig';
import * as ingestionController from '../controllers/ingestionController';


const router = Router();

// Resume ingestion endpoints
router.post('/v1/resume/upload', upload.single('file'), ingestionController.uploadResume);
router.post('/v1/resume/inject', upload.single('file'), ingestionController.injectResume);
router.post('/v1/resume/batch-upload', ingestionController.batchUploadResumes);
router.post('/v1/resume/batch-upload/queue', ingestionController.enqueueBatchUpload);
router.get('/v1/resume/batch-upload/queue', ingestionController.getBatchUploadQueue);
router.get('/v1/resume/batch-upload/queue/:jobId', ingestionController.getBatchUploadQueueJob);
router.post('/v1/resume/extract', ingestionController.extractText);
router.post('/v1/resume/clean', ingestionController.cleanText);
router.post('/v1/resume/skills', ingestionController.detectSkills);
router.post('/v1/resume/llm-parse', ingestionController.llmParseResume);
router.post('/v1/resume/embed', ingestionController.embedResume);
router.post('/v1/resume/parse', ingestionController.parseResume);
router.post('/v1/resume/store', ingestionController.storeResume);

export default router;
