const { AsyncLocalStorage } = require('async_hooks');

// This stores the business_id for the current request/execution context
const tenantContext = new AsyncLocalStorage();

module.exports = {
  tenantContext
};
