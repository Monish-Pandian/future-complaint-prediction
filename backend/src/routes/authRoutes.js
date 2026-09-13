const express = require('express');
const { register, login, getMe, logout } = require('../controllers/authController');
const { validateRegister, validateLogin } = require('../validators/authValidators');
const authenticate = require('../middleware/authenticate');
const { authRateLimiter } = require('../config/security');

const router = express.Router();

router.post('/register', authRateLimiter, validateRegister, register);
router.post('/login', authRateLimiter, validateLogin, login);
router.get('/me', authenticate, getMe);
router.post('/logout', authenticate, logout);

module.exports = router;
