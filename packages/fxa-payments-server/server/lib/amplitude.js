/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

const {
  GROUPS,
  initialize,
  mapBrowser,
  mapFormFactor,
  mapLocation,
  mapOs,
  toSnakeCase,
  validate,
} = require('../../../fxa-shared/metrics/amplitude.js');
const config = require('../config');
const amplitude = config.get('amplitude');
const log = require('./logging/log')();
const ua = require('../../../fxa-shared/metrics/user-agent');
const { version: VERSION } = require('../../package.json');
const Sentry = require('@sentry/node');

const FUZZY_EVENTS = new Map([
  [
    // Emit events from the front-end as `amplitude.${GROUP}.${EVENT}`
    /^amplitude\.([\w-]+)\.([\w-]+)$/,
    {
      group: group => GROUPS[group],
      event: (group, event) => toSnakeCase(event),
    },
  ],
]);

const transform = initialize({}, {}, FUZZY_EVENTS);

module.exports = (event, request, data, requestReceivedTime) => {
  if (!amplitude.enabled || !event || !request || !data) {
    return;
  }

  requestReceivedTime = requestReceivedTime || Date.now();

  const userAgent = ua.parse(request.headers['user-agent']);

  const amplitudeEvent = transform(event, {
    version: VERSION,
    ...mapBrowser(userAgent),
    ...mapOs(userAgent),
    ...mapFormFactor(userAgent),
    ...mapLocation(data.location),
    ...data,
  });

  if (amplitudeEvent) {
    if (amplitude.schemaValidation) {
      try {
        validate(amplitudeEvent);
      } catch (err) {
        log.error('amplitude.validationError', { err, amplitudeEvent });

        // Since we are adding a schema retroactively, let's be conservative:
        // temporarily capture any validation "errors" with Sentry to ensure
        // that the schema is not too strict against existing events.  We'll
        // update the schema accordingly.  And allow the events in the
        // meantime.
        Sentry.withScope(scope => {
          scope.setContext('amplitude.validationError', {
            event_type: amplitudeEvent.event_type,
            flow_id: amplitudeEvent.user_properties.flow_id,
            err,
          });
          Sentry.captureMessage(
            'Amplitude event failed validation.',
            Sentry.Severity.Error
          );
        });
      }
    }

    // Amplitude events are logged to stdout, where they are picked up by the
    // stackdriver logging agent.
    log.info('amplitudeEvent', amplitudeEvent);
  }
};
