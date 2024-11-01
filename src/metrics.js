const config = require('./config.js');
const os = require('os');

class MetricBuilder {
  constructor() {
    this.buf = []
  }

  append(prefix, tags, metrics) {
    let metric = prefix;

    for (let tag in tags) {
      metric += `,${tag}=${tags[tag]}`;
    }
    metric += ' ';

    for (let metricName in metrics) {
      metric += `${metricName}=${metrics[metricName]},`;
    }
    metric = metric.slice(0, -1);

    this.buf.push(metric);
  }

  toString(delimiter) {
    return this.buf.join(delimiter);
  }
}

class Metrics {
  constructor() {
    this.httpMetrics = new HttpMetrics();
    this.systemMetrics = new SystemMetrics();
    this.userMetrics = new UserMetrics();
    this.purchaseMetrics = new PurchaseMetrics();
    this.authMetrics = new AuthMetrics();
    this.chaosMetrics = new ChaosMetrics();

    this.sendMetricsPeriodically(10000);
  }

  sendMetricsPeriodically(period) {
    const timer = setInterval(() => {
      try {
        const buf = new MetricBuilder();
        this.httpMetrics.getMetrics(buf);
        this.systemMetrics.getMetrics(buf);
        this.userMetrics.getMetrics(buf);
        this.purchaseMetrics.getMetrics(buf);
        this.authMetrics.getMetrics(buf);
        this.chaosMetrics.getMetrics(buf);
  
        const metrics = buf.toString('\n');
        this.sendMetricToGrafana(metrics);
      } catch (error) {
        console.log('Error sending metrics', error);
      }
    }, period);
    timer.unref();
  }

  sendMetricToGrafana(metrics) {
    fetch(`${config.metrics.url}`, {
      method: 'post',
      body: metrics,
      headers: { Authorization: `Bearer ${config.metrics.userId}:${config.metrics.apiKey}` },
    })
      .then((response) => {
        if (!response.ok) {
          console.error('Failed to push metrics data to Grafana');
        } else {
          console.log(`Pushed ${metrics}`);
        }
      })
      .catch((error) => {
        console.error('Error pushing metrics:', error);
      });
  }
}

class Metric {
  constructor(prefix, tags, metrics) {
    this.prefix = prefix;
    this.tags = {source: config.metrics.source, ...tags};
    this.metrics = metrics;
  }
}

class AnyMetrics {
  constructor() {
    this.metrics = {};
  }

  getMetrics(builder) {
    for (let metricName in this.metrics) {
      const metric = this.metrics[metricName];
      builder.append(metric.prefix, metric.tags, metric.metrics);
    }
  }
}

class HttpMetrics extends AnyMetrics {
  constructor() {
    super();
    this.totalRequests = 0;
    this.totalDeleteRequests = 0;
    this.totalGetRequests = 0;
    this.totalPostRequests = 0;
    this.totalPutRequests = 0;
  }

  requestTracker(req, res, next) {
    if (req.method === 'DELETE') {
      this.totalDeleteRequests++;
      this.metrics.delete = new Metric('http_requests', {method: 'delete'}, {total: this.totalDeleteRequests});
    } else if (req.method === 'GET') {
      this.totalGetRequests++;
      this.metrics.get = new Metric('http_requests', {method: 'get'}, {total: this.totalGetRequests});
    } else if (req.method === 'POST') {
      this.totalPostRequests++;
      this.metrics.post = new Metric('http_requests', {method: 'post'}, {total: this.totalPostRequests});
    } else if (req.method === 'PUT') {
      this.totalPutRequests++;
      this.metrics.put = new Metric('http_requests', {method: 'put'}, {total: this.totalPutRequests});
    }
    this.totalRequests++;
    this.metrics.total = new Metric('http_requests', {method: 'all'}, {total: this.totalRequests});

    next();
  }
}

class SystemMetrics extends AnyMetrics {
  constructor() {
    super();
    this.cpuUsage = 0;
    this.memoryUsage = 0;
    this.setMetrics(1000);
  }

  getCpuUsagePercentage() {
    const cpuUsage = os.loadavg()[0] / os.cpus().length;
    return cpuUsage.toFixed(2) * 100;
  }
  
  getMemoryUsagePercentage() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = (usedMemory / totalMemory) * 100;
    return memoryUsage.toFixed(2);
  }

  setMetrics(period) {
    const timer = setInterval(() => {
      this.cpuUsage = this.getCpuUsagePercentage();
      this.memoryUsage = this.getMemoryUsagePercentage();
      this.metrics = {
        cpu: new Metric('system', {type: 'CPU'}, {usage: this.cpuUsage}),
        memory: new Metric('system', {type: 'Memory'}, {usage: this.memoryUsage}),
      };
    }, period);
    timer.unref();
  }
}

class UserMetrics extends AnyMetrics {
  constructor() {
    super();
    this.totalUsers = 0;
  }

  setMetrics() {
    this.metrics = {
      total: new Metric('users', null, {total: this.totalUsers}),
    };
  }

  incrementActiveUsers() {
    this.totalUsers++;
    this.setMetrics();
  }

  decrementActiveUsers() {
    this.totalUsers--;
    this.setMetrics();
  }
}

class PurchaseMetrics extends AnyMetrics {
  constructor() {
    super();
    this.totalPurchases = 0;
    this.totalRevenue = 0;
    this.currentCreationLatency = 0;
    this.totalCreationFailures = 0;
  }

  purchaseTracker(req, res, next) {
    if (req.method !== 'POST') {
      next();
      return;
    }

    const order = req.body;

    this.totalPurchases += order.items.length;
    this.metrics.purchases = new Metric('sales', {type: 'Purchases'}, {total: this.totalPurchases});

    let totalCost = 0;
    for (let item of order.items) {
      totalCost += item.price;
    }
    this.totalRevenue += totalCost;
    this.metrics.revenue = new Metric('sales', {type: 'Revenue'}, {total: this.totalRevenue});

    next();
  }

  updateLatencyMetric(latency) {
    this.currentCreationLatency = latency;
    this.metrics.latency = new Metric('creation', {type: 'Latency'}, {current: this.currentCreationLatency});
  }

  incrementFailures() {
    this.totalCreationFailures++;
    this.metrics.failures = new Metric('creation', {type: 'Failures'}, {total: this.totalCreationFailures});
  }
}

class AuthMetrics extends AnyMetrics {
  constructor() {
    super();
    this.totalSuccesses = 0;
    this.totalFailures = 0;
  }

  incrementSuccesses() {
    this.totalSuccesses++;
    this.metrics.success = new Metric('auth', {result: 'Successful'}, {total: this.totalSuccesses});
  }

  incrementFailures() {
    this.totalFailures++;
    this.metrics.fail = new Metric('auth', {result: 'Failed'}, {total: this.totalFailures});
  }
}

class ChaosMetrics extends AnyMetrics {
  constructor() {
    super();
    this.chaosEnabled = false;
    this.enableChaos(this.chaosEnabled);
  }

  enableChaos(enabled) {
    this.chaosEnabled = enabled;
    this.metrics.chaos = new Metric('chaos', null, {enabled: this.chaosEnabled ? 1 : 0});
  }
}

const metrics = new Metrics();
module.exports = metrics;