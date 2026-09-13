const authValidators = require('./authValidators');
const officerValidators = require('./officerValidators');

module.exports = {
  ...authValidators,
  ...officerValidators,
};
