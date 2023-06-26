'use strict';

const { Driver } = require('homey');

module.exports = class beewiDriver extends Driver {

  async onInit() {
    this.log(`${this.name()} driver has been initialized`);
  }

  async onPairListDevices() {
    const advertisements = await this.homey.ble.discover();
    return advertisements
    .filter(advertisement => advertisement.localName && advertisement.localName.includes('BeeWi'))
    .map(advertisement => {
      console.log(advertisement);
      return {
        name: advertisement.localName,
        data: {
          id: advertisement.uuid
        },
        store: {
          id: advertisement.uuid,
          serviceUuid: this.serviceUuid(),
        },
      }
    })
  }

  name() { 
    return '<unknown>'
  }

  serviceUuid() {
    // extend me
    throw new error('service ID is undefined!')
  }

}
