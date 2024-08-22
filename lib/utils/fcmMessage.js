"use strict";

const _excluded = ["providersExclude"];

function _objectWithoutProperties(source, excluded) { if (source == null) return {}; var target = _objectWithoutPropertiesLoose(source, excluded); var key, i; if (Object.getOwnPropertySymbols) { var sourceSymbolKeys = Object.getOwnPropertySymbols(source); for (i = 0; i < sourceSymbolKeys.length; i++) { key = sourceSymbolKeys[i]; if (excluded.indexOf(key) >= 0) continue; if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue; target[key] = source[key]; } } return target; }

function _objectWithoutPropertiesLoose(source, excluded) { if (source == null) return {}; var target = {}; var sourceKeys = Object.keys(source); var key, i; for (i = 0; i < sourceKeys.length; i++) { key = sourceKeys[i]; if (excluded.indexOf(key) >= 0) continue; target[key] = source[key]; } return target; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const _require = require('./tools'),
      buildGcmMessage = _require.buildGcmMessage,
      buildApnsMessage = _require.buildApnsMessage;

class FcmMessage {
  constructor(params) {
    this.data = params.data;
    this.android = params.android;
    this.apns = params.apns;
  }

  buildWithRecipients(recipients) {
    return _objectSpread({
      data: this.data,
      android: this.android,
      apns: this.apns
    }, recipients);
  }

  static normalizeDataParams(data) {
    if (!data) return {};
    return Object.entries(data).reduce((normalized, [key, value]) => {
      if (value === undefined || value === null) {
        return normalized;
      }

      const stringifyValue = typeof value === 'string' ? value : JSON.stringify(value);
      Object.assign(normalized, {
        [key]: stringifyValue
      });
      return normalized;
    }, {});
  }

  static buildAndroidMessage(params) {
    const message = buildGcmMessage(params, {});
    const androidMessage = message.toJson();
    androidMessage.ttl = androidMessage.time_to_live;
    delete androidMessage.content_available;
    delete androidMessage.mutable_content;
    delete androidMessage.delay_while_idle;
    delete androidMessage.time_to_live;
    delete androidMessage.dry_run;
    delete androidMessage.data;
    return androidMessage;
  }

  static buildApnsMessage(params) {
    const message = buildApnsMessage(params);
    delete message.payload;
    const headers = message.headers() || {};
    const payload = message.toJSON() || {};
    return {
      headers: this.normalizeDataParams(headers),
      payload
    };
  }

  static build(params) {
    const _params$providersExcl = params.providersExclude,
          providersExclude = _params$providersExcl === void 0 ? [] : _params$providersExcl,
          fcmMessageParams = _objectWithoutProperties(params, _excluded);

    const data = this.normalizeDataParams(fcmMessageParams.custom);
    const createParams = {
      data
    };

    if (!providersExclude.includes('apns')) {
      createParams.apns = this.buildApnsMessage(fcmMessageParams);
    }

    if (!providersExclude.includes('android')) {
      createParams.android = this.buildAndroidMessage(fcmMessageParams);
    }

    return new this(createParams);
  }

}

module.exports = FcmMessage;