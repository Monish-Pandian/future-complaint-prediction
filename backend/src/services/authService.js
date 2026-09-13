const bcrypt = require('bcryptjs');
const { User, ROLES } = require('../models/User');
const ApiError = require('../utils/apiError');
const { generateToken } = require('../utils/jwt');

/**
 * Register a new user account
 * @param {Object} data
 * @param {string} data.name
 * @param {string} data.email
 * @param {string} data.password
 * @param {string} [data.role]
 * @param {string} [data.officerId]
 * @param {string} [data.department]
 */
const register = async ({ name, email, password, role = ROLES.OFFICER, officerId, department }) => {
  const normalizedEmail = email.toLowerCase().trim();

  // Check for duplicate email
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new ApiError(409, 'Email address is already registered', [
      'An account with this email address already exists',
    ]);
  }

  // Hash plaintext password using bcrypt
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // Create user record
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    role: role || ROLES.OFFICER,
    officerId: officerId || null,
    department: department || null,
    isActive: true,
  });

  // Generate JWT Token
  const token = generateToken(user);

  return {
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    },
    token,
  };
};

/**
 * Authenticate user by email and password
 * @param {Object} credentials
 * @param {string} credentials.email
 * @param {string} credentials.password
 */
const login = async ({ email, password }) => {
  const normalizedEmail = email.toLowerCase().trim();

  // Find user and explicitly select passwordHash
  const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');

  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  // Check password validity
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password');
  }

  // Check if account is active
  if (!user.isActive) {
    throw new ApiError(403, 'Account is deactivated. Please contact an administrator.');
  }

  // Generate JWT Token
  const token = generateToken(user);

  return {
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    },
    token,
  };
};

/**
 * Get current authenticated user profile
 * @param {string} userId
 */
const getMe = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Account is deactivated');
  }

  return {
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      ...(user.officerId ? { officerId: user.officerId } : {}),
      ...(user.department ? { department: user.department } : {}),
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  };
};

module.exports = {
  register,
  login,
  getMe,
};
