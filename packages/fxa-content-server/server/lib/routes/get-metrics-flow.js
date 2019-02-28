/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

const amplitude = require('../amplitude');
const flowMetrics = require('../flow-metrics');
const joi = require('joi');
const logFlowEvent = require('../flow-event').logFlowEvent;
const logger = require('../logging/log')('server.get-metrics-flow');
const uuid = require('node-uuid');
const validation = require('../validation');

const {
  ENTRYPOINT: ENTRYPOINT_PATTERN,
  FORM_TYPE: FORM_TYPE_PATTERN,
  SERVICE: SERVICE_PATTERN,
} = validation.PATTERNS;

const {
  STRING: STRING_TYPE,
  UTM: UTM_TYPE,
  UTM_CAMPAIGN: UTM_CAMPAIGN_TYPE,
} = validation.TYPES;

module.exports = function (config) {
  const FLOW_ID_KEY = config.get('flow_id_key');
  const FLOW_EVENT_NAME = 'flow.begin';
  const ENTER_EMAIL_SCREEN_EVENT_NAME = 'screen.enter-email';
  const ENTER_EMAIL_FLOW_EVENT_NAME = 'flow.enter-email.view';
  const FORM_TYPE_EMAIL = 'email';
  const ALLOWED_CORS_ORIGINS = config.get('allowed_metrics_flow_cors_origins');
  const CORS_OPTIONS = {
    methods: 'GET',
    origin: function corsOrigin(origin, callback) {
      if (ALLOWED_CORS_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        logger.info('request.metrics-flow.bad-origin', origin);
        callback(new Error('CORS Error'));
      }
    },
    preflightContinue: false
  };

  const QUERY_SCHEMA = joi.object({
    // Not passed by the Firefox Concert Series, otherwise should be required.
    // See https://github.com/mozilla/bedrock/issues/6839
    entrypoint: STRING_TYPE.regex(ENTRYPOINT_PATTERN).optional(),
    // Not passed by the Firefox Concert Series, otherwise should be required.
    // See https://github.com/mozilla/bedrock/issues/6839
    'form_type': STRING_TYPE.regex(FORM_TYPE_PATTERN).optional(),
    'service': STRING_TYPE.regex(SERVICE_PATTERN).optional(),
    'utm_campaign': UTM_CAMPAIGN_TYPE.required(),
    'utm_content': UTM_TYPE.optional(),
    'utm_medium': UTM_TYPE.optional(),
    'utm_source': UTM_TYPE.required(),
    'utm_term': UTM_TYPE.optional()
  });

  const route = {};
  route.method = 'get';
  route.path = '/metrics-flow';
  route.cors = CORS_OPTIONS;

  route.process = function (req, res) {
    const result = QUERY_SCHEMA.validate(req.query);
    if (result.error) {
      // Note from 2019-02-18, parameter validation was added after several important
      // pages were already calling this endpoint. To avoid causing any of those pages
      // to error out, log and swallow any validation errors. If no errors are logged,
      // then we can change to return an error.
      const errorDetails = result.error.details && result.error.details[0];
      const paramName =  errorDetails && errorDetails.path;
      const paramValue =  errorDetails && errorDetails.context && errorDetails.context.value;
      logger.info('request.metrics-flow.invalid-param', {
        param: paramName || 'unknown',
        value: paramValue || 'unknown'
      });
    }

    const flowEventData = flowMetrics.create(FLOW_ID_KEY, req.headers['user-agent']);
    const flowBeginTime = flowEventData.flowBeginTime;
    const flowId = flowEventData.flowId;
    const metricsData = req.query || {};
    const beginEvent = {
      flowTime: flowBeginTime,
      time: flowBeginTime,
      type: FLOW_EVENT_NAME
    };

    metricsData.flowId = flowId;
    // Amplitude-specific device id, like the client-side equivalent
    // created in app/scripts/lib/app-start.js. Transient for now,
    // but will become persistent in due course.
    metricsData.deviceId = uuid.v4().replace(/-/g, '');

    amplitude(beginEvent, req, metricsData);
    logFlowEvent(beginEvent, metricsData, req);

    if (metricsData.form_type === FORM_TYPE_EMAIL) {
      amplitude({
        flowTime: flowBeginTime,
        time: flowBeginTime,
        type: ENTER_EMAIL_SCREEN_EVENT_NAME
      }, req, metricsData);
      logFlowEvent({
        flowTime: flowBeginTime,
        time: flowBeginTime,
        type: ENTER_EMAIL_FLOW_EVENT_NAME
      }, metricsData, req);
    }

    // charset must be set on json responses.
    res.charset = 'utf-8';
    res.json({
      flowBeginTime: flowEventData.flowBeginTime,
      flowId: flowId
    });
  };

  return route;
};
