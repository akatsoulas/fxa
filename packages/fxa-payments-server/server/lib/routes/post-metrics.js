/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

const joi = require('joi');
const amplitude = require('../amplitude');

// TODO: add more validators, and extract validators duplicated here and in
//       fxa-content-server into fxa-shared
const clientMetricsConfig = config.get('client_metrics');
const MAX_EVENT_OFFSET = clientMetricsConfig.maxEventOffset;
const EVENT_TYPE_PATTERN = /^[\w\s.:-]+$/; // the space is to allow for error contexts that contain spaces, e.g., `error.unknown context.auth.108`
const BODY_SCHEMA = {
  data: joi.object().required(),
  events: joi
    .array()
    .items(
      joi.object().keys({
        offset: OFFSET_TYPE.max(MAX_EVENT_OFFSET).required(),
        type: STRING_TYPE.regex(EVENT_TYPE_PATTERN).required(),
      })
    )
    .required(),
};

module.exports = {
  method: 'post',
  path: '/metrics',
  validate: {
    body: BODY_SCHEMA,
  },
  handler(request, response) {
    const { data, events } = request.body;
    events.forEach(event => amplitude(event, request, data));
    response.status(200).end();
  },
};
