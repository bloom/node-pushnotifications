"use strict";

const _excluded = ["providersExclude"];
function _objectWithoutProperties(source, excluded) { if (source == null) return {}; var target = _objectWithoutPropertiesLoose(source, excluded); var key, i; if (Object.getOwnPropertySymbols) { var sourceSymbolKeys = Object.getOwnPropertySymbols(source); for (i = 0; i < sourceSymbolKeys.length; i++) { key = sourceSymbolKeys[i]; if (excluded.indexOf(key) >= 0) continue; if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue; target[key] = source[key]; } } return target; }
function _objectWithoutPropertiesLoose(source, excluded) { if (source == null) return {}; var target = {}; var sourceKeys = Object.keys(source); var key, i; for (i = 0; i < sourceKeys.length; i++) { key = sourceKeys[i]; if (excluded.indexOf(key) >= 0) continue; target[key] = source[key]; } return target; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
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
    androidMessage.ttl = androidMessage.time_to_live * 1000;
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