/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * List of methods by which a user can verify.
 * A user can currently only verify via email.
 * In the future SMS and TOTP could also be included.
 */

define(function (require, exports, module) {
  'use strict';

  return {
    EMAIL: 'email',
    EMAIL_CAPTCHA: 'email-captcha'
  };
});
