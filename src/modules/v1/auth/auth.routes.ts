import { Router } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { login, registerOrganization } from './auth.controller';
import { authRateLimiter } from '@/middleware/rateLimit.middleware';

const router = Router();

router.post('/login', authRateLimiter, asyncHandler(login));
router.post('/register', authRateLimiter, asyncHandler(registerOrganization));

export default router;
