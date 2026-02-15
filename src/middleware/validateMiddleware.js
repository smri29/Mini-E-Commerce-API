const { validationResult } = require('express-validator');
const ApiError = require('../utils/apiError');

const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (errors.isEmpty()) return next();

  const msg = errors
    .array({ onlyFirstError: true })
    .map((e) => `${e.path || e.param}: ${e.msg}`)
    .join(', ');

  return next(new ApiError(400, msg || 'Validation failed'));
};

module.exports = validate;
