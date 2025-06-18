import express from 'express';
import emailController from '../controllers/emailController';
import { auth, verifyToken, optionalAuth, isAdmin, authorize } from '../utils/middlewareHelpers';

const router = express.Router();

// Send confirmation email
router.post('/send-confirmation', (req, res, next) => {
  emailController.sendConfirmation(req, res).catch(next);
});


router.get('/test', emailController.test);

router.get('/protected-route', auth, (req, res) => {
  // Your handler code
});

export default router;