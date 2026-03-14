const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');
const Customer = require('../models/Customer');
const catchAsync = require('../utils/catchAsync');

exports.protectCustomer = catchAsync(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(AppError.unauthorized('يجب تسجيل الدخول للوصول إلى هذه الصفحة'));
  }

  const decoded = await new Promise((resolve, reject) => {
    jwt.verify(token, process.env.JWT_SECRET, (error, payload) => {
      if (error) return reject(error);
      return resolve(payload);
    });
  });

  const customer = await Customer.findById(decoded.id);
  if (!customer) {
    return next(AppError.unauthorized('المستخدم لم يعد موجوداً'));
  }

  if (!customer.isActive) {
    return next(AppError.unauthorized('تم تعطيل هذا الحساب'));
  }

  if (customer.isPortalActive === false) {
    return next(AppError.forbidden('حساب البوابة غير مفعل'));
  }

  req.user = customer;
  req.tenant = {
    _id: customer.tenant?._id || customer.tenant,
  };
  req.tenantId = customer.tenant?._id || customer.tenant;

  next();
});
