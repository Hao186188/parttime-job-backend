import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided, access denied'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token is invalid'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({
      success: false,
      message: 'Token is not valid'
    });
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      const user = await User.findById(decoded.id).select('-password');
      if (user && user.isActive) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    next(); // tiếp tục ngay cả khi token sai
  }
};

export const employerAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {
      if (req.user.userType !== 'employer') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Employer privileges required.'
        });
      }
      next();
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

export const studentAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {
      if (req.user.userType !== 'student') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Student privileges required.'
        });
      }
      next();
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};
