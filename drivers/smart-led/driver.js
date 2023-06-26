'use strict';

const beewiDriver = require('../../lib/BeeWiDriver')

module.exports = class MyDriver extends beewiDriver {
  name() { return 'Smart LED'}
  serviceUuid() { return 'a8b3fff04834405189d03de95cddd318'}
}
