import dataBoostRouter from '@/routes/data-boost.route';
import dataRouter from '@/routes/data.route';
import datasetRouter from '@/routes/dataset.route';
import llmRouter from '@/routes/llm.route';
import outputFormatRouter from '@/routes/output-format.route';
import promptRouter from '@/routes/prompt.route';
import express, { Router } from 'express';
const router: Router = express.Router();

// Dataset routes
router.use('/datasets', datasetRouter);

// Data routes
router.use('/data', dataRouter);

// Data boost routes
router.use('/data-boosts', dataBoostRouter);

// Output format routes
router.use('/output-formats', outputFormatRouter);

// Prompt routes
router.use('/prompts', promptRouter);

// LLM routes
router.use('/llm', llmRouter);

export default router;