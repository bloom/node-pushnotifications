"use strict";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const R = require('ramda');

const _require = require('@parse/node-apn'),
      ApnsMessage = _require.Notification;

const _require2 = require('node-gcm'),
      GcmMessage = _require2.Message;

const _require3 = require('../constants'),
      DEFAULT_TTL = _require3.DEFAULT_TTL,
      GCM_MAX_TTL = _require3.GCM_MAX_TTL;

const ttlFromExpiry = R.compose(R.min(GCM_MAX_TTL), R.max(0), expiry => expiry - Math.floor(Date.now() / 1000));
const extractTimeToLive = R.cond([[R.propIs(Number, 'expiry'), ({
  expiry
}) => ttlFromExpiry(expiry)], [R.propIs(Number, 'timeToLive'), R.prop('timeToLive')], [R.T, R.always(DEFAULT_TTL)]]);

const expiryFromTtl = ttl => ttl + Math.floor(Date.now() / 1000);

const extractExpiry = R.cond([[R.propIs(Number, 'expiry'), R.prop('expiry')], [R.propIs(Number, 'timeToLive'), ({
  timeToLive
}) => expiryFromTtl(timeToLive)], [R.T, () => expiryFromTtl(DEFAULT_TTL)]]);

const getPropValueOrUndefinedIfIsSilent = (propName, data) => R.ifElse(R.propEq('silent', true), R.always(undefined), R.prop(propName))(data);

const toJSONorUndefined = R.when(R.is(String), R.tryCatch(JSON.parse, R.always(undefined)));
const alertLocArgsToJSON = R.evolve({
  alert: {
    'title-loc-args': toJSONorUndefined,
    'loc-args': toJSONorUndefined
  }
});

const getDefaultAlert = data => ({
  title: data.title,
  body: data.body,
  'title-loc-key': data.titleLocKey,
  'title-loc-args': data.titleLocArgs,
  'loc-key': data.locKey,
  'loc-args': data.locArgs || data.bodyLocArgs,
  'launch-image': data.launchImage,
  action: data.action
});

const alertOrDefault = data => R.when(R.propSatisfies(R.isNil, 'alert'), R.assoc('alert', getDefaultAlert(data)));

const getParsedAlertOrDefault = data => R.pipe(alertOrDefault(data), alertLocArgsToJSON)(data);

const pathIsString = R.pathSatisfies(R.is(String));
const containsValidRecipients = R.either(pathIsString(['recipients', 'to']), pathIsString(['recipients', 'condition']));

const propValueToSingletonArray = propName => R.compose(R.of, R.prop(propName));

const buildGcmNotification = data => {
  const notification = data.fcm_notification || {
    title: data.title,
    body: data.body,
    icon: data.icon,
    image: data.image,
    picture: data.picture,
    style: data.style,
    sound: data.sound,
    badge: data.badge,
    tag: data.tag,
    color: data.color,
    click_action: data.clickAction || data.category,
    body_loc_key: data.locKey,
    body_loc_args: toJSONorUndefined(data.locArgs),
    title_loc_key: data.titleLocKey,
    title_loc_args: toJSONorUndefined(data.titleLocArgs),
    android_channel_id: data.android_channel_id,
    notification_count: data.notificationCount || data.badge
  };
  return notification;
};

const buildGcmMessage = (data, options) => {
  const notification = buildGcmNotification(data);
  let custom;

  if (typeof data.custom === 'string') {
    custom = {
      message: data.custom
    };
  } else if (typeof data.custom === 'object') {
    custom = _objectSpread({}, data.custom);
  } else {
    custom = {
      data: data.custom
    };
  }

  custom.title = custom.title || data.title;
  custom.message = custom.message || data.body;
  custom.sound = custom.sound || data.sound;
  custom.icon = custom.icon || data.icon;
  custom.msgcnt = custom.msgcnt || data.badge;

  if (options.phonegap === true && data.contentAvailable) {
    custom['content-available'] = 1;
  }

  const ttl = extractTimeToLive(data);
  const message = new GcmMessage({
    collapseKey: data.collapseKey,
    priority: data.priority === 'normal' ? 'normal' : 'high',
    contentAvailable: data.silent ? true : data.contentAvailable || false,
    delayWhileIdle: data.delayWhileIdle || false,
    timeToLive: ttl,
    time_to_live: ttl,
    restrictedPackageName: data.restrictedPackageName,
    dryRun: data.dryRun || false,
    data: options.phonegap === true ? Object.assign(custom, notification) : custom,
    notification: options.phonegap === true || data.silent === true ? undefined : notification
  });
  return message;
};

const buildApnsMessage = data => {
  const message = new ApnsMessage({
    retryLimit: data.retries || -1,
    expiry: extractExpiry(data),
    priority: data.priority === 'normal' || data.silent === true ? 5 : 10,
    encoding: data.encoding,
    payload: data.custom || {},
    badge: getPropValueOrUndefinedIfIsSilent('badge', data),
    sound: getPropValueOrUndefinedIfIsSilent('sound', data),
    alert: getPropValueOrUndefinedIfIsSilent('alert', getParsedAlertOrDefault(data)),
    topic: data.topic,
    category: data.category || data.clickAction,
    contentAvailable: data.contentAvailable,
    mdm: data.mdm,
    urlArgs: data.urlArgs,
    truncateAtWordEnd: data.truncateAtWordEnd,
    collapseId: data.collapseKey,
    mutableContent: data.mutableContent || 0,
    threadId: data.threadId,
    pushType: data.pushType,
    interruptionLevel: data.interruptionLevel
  });

  if (data.rawPayload) {
    message.rawPayload = data.rawPayload;
  }

  return message;
};

module.exports = {
  ttlAndroid: extractTimeToLive,
  apnsExpiry: extractExpiry,
  containsValidRecipients,
  propValueToSingletonArray,
  buildApnsMessage,
  buildGcmMessage
};