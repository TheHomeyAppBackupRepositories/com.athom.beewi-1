'use strict';

const { Device } = require('homey');
const Util = require('./util')

const DATA_WRITE_CHARACTERISTIC = 'a8b3fff14834405189d03de95cddd318';
const DATA_RECEIVE_CHARACTERISTIC = 'a8b3fff24834405189d03de95cddd318'

module.exports = class beewiDevice extends Device {
  connected = false;
  peripheral = null;
  _connectionInterval = null;

  async setBulbOnOff(on) {
    const onOff = on ? 1 : 0;
    await this.peripheral.write(this.serviceUuidShort, DATA_WRITE_CHARACTERISTIC, Buffer.from([85, 16, onOff, 14, 10]))
  }

  async setBulbDim(dim) {
    const value = Math.round(dim * 9) + 2;
    await this.peripheral.write(this.serviceUuidShort, DATA_WRITE_CHARACTERISTIC, Buffer.from([85, 18, value, 14, 10]))
  }

  async setBulbTemperature(temperature) {
    const temp = Math.round(temperature * 9) + 2;
    await this.peripheral.write(this.serviceUuidShort, DATA_WRITE_CHARACTERISTIC, Buffer.from([85, 17, temp, 14, 10]))
  }

  async setBulbColor(hue, saturation) {
    const [r,g,b] = Util.hslToRgb(hue * 360, saturation, 0.5);
    await this.peripheral.write(this.serviceUuidShort, DATA_WRITE_CHARACTERISTIC, Buffer.from([85, 19, r, g, b, 14, 10]))
  }

  async onInit() {    
    this.serviceUuidShort = this.getStore().serviceUuid;
    this.setUnavailable('Initializing');

    this.registerCapabilityListener('onoff', async isOn => {
      if (isOn) return this.setBulbOnOff(true);
      return this.setBulbOnOff(false);
    });

    this.registerCapabilityListener('dim', async dim => {
      if (dim === 0) {
        await this.setCapabilityValue('onoff', false);
        return this.setBulbOnOff(false);
      }
      if (!this.getCapabilityValue('onoff')) { 
        await this.setCapabilityValue('onoff', true);
        await this.setBulbOnOff(true);
      }
      await this.setBulbDim(dim);
    });

    this.registerMultipleCapabilityListener(['light_saturation', 'light_hue'], async (capabilityValues) => {

      if (!this.getCapabilityValue('onoff')) { 
        await this.setBulbOnOff(true);
        await this.setCapabilityValue('onoff', true);
      }

      // The loose equal used below checks for undefined as well.
      await this.setBulbColor(
        capabilityValues.light_hue != null ? capabilityValues.light_hue : this.getCapabilityValue('light_hue'), 
        capabilityValues.light_saturation != null ? capabilityValues.light_saturation : this.getCapabilityValue('light_saturation'));
      }, 150);

    this.registerCapabilityListener('light_temperature', async temperature => {
      if (!this.getCapabilityValue('onoff')) { 
        await this.setBulbOnOff(true);
        await this.setCapabilityValue('onoff', true);
      }
      await this.setBulbTemperature(temperature);
    });

    this.registerCapabilityListener('light_mode', async mode => {
      if (!this.getCapabilityValue('onoff')) { 
        await this.setBulbOnOff(true);
        await this.setCapabilityValue('onoff', true);
      }
      if (mode === 'temperature') {
        await this.setBulbTemperature(this.getCapabilityValue('light_temperature'));
      } else {
        await this.setBulbColor(this.getCapabilityValue('light_hue'), this.getCapabilityValue('light_saturation'));
      }
    });

    await this.connect();
    this._connectionInterval = this.homey.setInterval(() => {
      this.connect();
    }, 60000);
  }

  async connect() {
    this.log('connecting BeeWi device...')

    try {
      // We do not know when it has disconnected - but if it appears in discovery again then we must reconnect.
      const advertisement = await this.homey.ble.find(this.getStore().id).catch(err => {
        this.log("Find function failed: ", err);
        this.setUnavailable('Could not find device');
      });

      if (advertisement) {
        this.setUnavailable('Connecting');
        this.log('Connecting...');
        this.peripheral = await advertisement.connect();
        this.log('Reading state from device!');
        this.setAvailable();

        await this.peripheral.discoverAllServicesAndCharacteristics();
        const dataService = await this.peripheral.getService(this.serviceUuidShort);
        const dataCharacteristic = await dataService.getCharacteristic(DATA_RECEIVE_CHARACTERISTIC);
    
        const [on, dim, r, g, b] = await dataCharacteristic.read();
        await this.setCapabilityValue('onoff', on !== 0);
        await this.setCapabilityValue('dim', dim / 255);
        const [h,s,l] = Util.rgbToHsl(r, g, b);
        await this.setCapabilityValue('light_hue', h/360);
        await this.setCapabilityValue('light_saturation', s);
        this.log('Device ready!');
      }
    } catch (err) {
      this.log("Connect function failed: ", err);
      this.setUnavailable('Failed to connect');
    }
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log('Beewi smart led has been deleted');
    if (this.peripheral) await this.peripheral.disconnect();
    if (this._connectionInterval) this.homey.clearInterval(this._connectionInterval);
  }

}
