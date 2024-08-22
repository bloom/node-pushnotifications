"use strict";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const gcm = require('node-gcm');

const R = require('ramda');

const _require = require('./constants'),
      GCM_METHOD = _require.GCM_METHOD;

const _require2 = require('./utils/tools'),
      containsValidRecipients = _require2.containsValidRecipients,
      propValueToSingletonArray = _require2.propValueToSingletonArray,
      buildGcmMessage = _require2.buildGcmMessage;

const getRecipientList = R.cond([[R.has('registrationTokens'), R.prop('registrationTokens')], [R.has('to'), propValueToSingletonArray('to')], [R.has('condition'), propValueToSingletonArray('condition')]]);

const sendChunk = (GCMSender, recipients, message, retries) => new Promise(resolve => {
  const recipientList = getRecipientList(recipients);
  GCMSender.send(message, recipients, retries, (err, response) => {
    // Response: see https://developers.google.com/cloud-messaging/http-server-ref#table5
    if (err) {
      resolve({
        method: GCM_METHOD,
        success: 0,
        failure: recipientList.length,
        message: recipientList.map(value => ({
          originalRegId: value,
          regId: value,
          error: err,
          errorMsg: err instanceof Error ? err.message : err
        }))
      });
    } else if (response && response.results !== undefined) {
      let regIndex = 0;
      resolve({
        method: GCM_METHOD,
        multicastId: response.multicast_id,
        success: response.success,
        failure: response.failure,
        message: response.results.map(value => {
          const regToken = recipientList[regIndex];
          regIndex += 1;
          return {
            messageId: value.message_id,
            originalRegId: regToken,
            regId: value.registration_id || regToken,
            error: value.error ? new Error(value.error) : null,
            errorMsg: value.error ? value.error.message || value.error : null
          };
        })
      });
    } else {
      resolve({
        method: GCM_METHOD,
        multicastId: response.multicast_id,
        success: response.success,
        failure: response.failure,
        message: recipientList.map(value => ({
          originalRegId: value,
          regId: value,
          error: new Error('unknown'),
          errorMsg: 'unknown'
        }))
      });
    }
  });
});

const sendGCM = (regIds, data, settings) => {
  const opts = _objectSpread({}, settings.gcm);

  const id = opts.id;
  delete opts.id;
  const GCMSender = new gcm.Sender(id, opts);
  const promises = [];
  const message = buildGcmMessage(data, opts);
  let chunk = 0;
  /* allow to override device tokens with custom `to` or `condition` field:
   * https://github.com/ToothlessGear/node-gcm#recipients */

  if (containsValidRecipients(data)) {
    promises.push(sendChunk(GCMSender, data.recipients, message, data.retries || 0));
  } else {
    // Split tokens in 1.000 chunks, see https://developers.google.com/cloud-messaging/http-server-ref#table1
    do {
      const registrationTokens = regIds.slice(chunk * 1000, (chunk + 1) * 1000);
      promises.push(sendChunk(GCMSender, {
        registrationTokens
      }, message, data.retries || 0));
      chunk += 1;
    } while (1000 * chunk < regIds.length);
  }

  return Promise.all(promises).then(results => {
    const resumed = {
      method: GCM_METHOD,
      multicastId: [],
      success: 0,
      failure: 0,
      message: []
    };
    results.forEach(result => {
      if (result.multicastId) {
        resumed.multicastId.push(result.multicastId);
      }

      resumed.success += result.success;
      resumed.failure += result.failure;
      resumed.message.push(...result.message);
    });
    return resumed;
  });
};

module.exports = sendGCM;