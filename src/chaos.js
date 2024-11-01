let chaosEnabled = false;

function isChaosEnabled() {
  return chaosEnabled;
}

function enableChaos(value) {
  chaosEnabled = value;
}

module.exports = { isChaosEnabled, enableChaos };