const { metrics } = require('./metrics.js');

let chaosEnabled = false;

function isChaosEnabled() {
  return chaosEnabled;
}

function enableChaos(value) {
  chaosEnabled = value;
  metrics.chaos.enableChaos(value);
}

module.exports = { isChaosEnabled, enableChaos };