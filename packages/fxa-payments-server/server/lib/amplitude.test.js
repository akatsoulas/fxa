const amplitude = require('./amplitude');
const assert = require('chai').assert;
const sinon = require('sinon');

const log = {
  info: sinon.spy(),
};
const amplitudeConfig = {
  disabled: false,
};

const testEvents = ['amplitude.sub.relyingPartyView'];
// TODO: mock out logger to examine the fired log things.

// TODO: test the snakeCase conversions: amplitude.sub.relyingPartyView -> amplitude.fxa_subscribe.relying_party_view

describe('amplitude', () => {
  describe('transforms and logs valid data for all planned ping formats', () => {
    // TODO enumerate all planned pings, ensure they validate.
    it('needs a placeholder or will fail', () => {
      assert(true);
    });
  });

  // Most of the validation is tested by the fxa-shared lib.
  // But the fuzzy event matching should be tested here.
  describe('fuzzy event matching works for all planned ping formats', () => {
    // TODO enumerate all planned events, ensure they match.
  });
});
