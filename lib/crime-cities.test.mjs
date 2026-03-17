import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  getCrimeCityConfig,
  getDefaultCrimeCitySlug,
  getAllCrimeCitySlugs,
} from './crime-cities.ts';

describe('crime-cities registry', () => {
  it('default slug is san-francisco', () => {
    assert.equal(getDefaultCrimeCitySlug(), 'san-francisco');
  });

  it('lists all supported cities', () => {
    const slugs = getAllCrimeCitySlugs();
    assert.ok(slugs.includes('san-francisco'));
    assert.ok(slugs.includes('new-york'));
    assert.ok(slugs.includes('los-angeles'));
    assert.ok(slugs.includes('chicago'));
    assert.ok(slugs.includes('seattle'));
    assert.ok(slugs.includes('cincinnati'));
    assert.ok(slugs.includes('dallas'));
    assert.equal(slugs.length, 7);
  });

  it('returns undefined for unknown city', () => {
    assert.equal(getCrimeCityConfig('atlantis'), undefined);
  });

  describe('each city config has required fields', () => {
    const required = [
      'slug', 'label', 'host', 'datasetId', 'fields',
      'appTokenEnvVar', 'dateFilterField', 'providerName', 'portalBaseUrl',
    ];

    for (const slug of getAllCrimeCitySlugs()) {
      it(`${slug} has all required fields`, () => {
        const config = getCrimeCityConfig(slug);
        assert.ok(config, `config for ${slug} should exist`);
        for (const key of required) {
          assert.ok(key in config, `${slug} missing field: ${key}`);
          assert.ok(config[key] !== undefined, `${slug}.${key} is undefined`);
        }
      });

      it(`${slug} fields map has lat/lng`, () => {
        const { fields } = getCrimeCityConfig(slug);
        assert.ok(fields.latitude, `${slug} missing latitude field`);
        assert.ok(fields.longitude, `${slug} missing longitude field`);
        assert.ok(fields.datetime, `${slug} missing datetime field`);
        assert.ok(fields.category, `${slug} missing category field`);
      });

      it(`${slug} slug matches its key`, () => {
        const config = getCrimeCityConfig(slug);
        assert.equal(config.slug, slug);
      });

      it(`${slug} portal URL is https`, () => {
        const config = getCrimeCityConfig(slug);
        assert.ok(config.portalBaseUrl.startsWith('https://'));
      });
    }
  });

  it('LA uses lat/lon (not latitude/longitude)', () => {
    const la = getCrimeCityConfig('los-angeles');
    assert.equal(la.fields.latitude, 'lat');
    assert.equal(la.fields.longitude, 'lon');
  });

  it('SF has separate dateFilterField from datetime', () => {
    const sf = getCrimeCityConfig('san-francisco');
    assert.notEqual(sf.fields.datetime, sf.dateFilterField);
    assert.equal(sf.dateFilterField, 'incident_date');
  });

  it('SF excludes non-criminal categories', () => {
    const sf = getCrimeCityConfig('san-francisco');
    assert.ok(sf.excludedCategories.length > 0);
    assert.ok(sf.excludedCategories.includes('Non-Criminal'));
  });

  it('Chicago excludes non-criminal categories', () => {
    const chi = getCrimeCityConfig('chicago');
    assert.ok(chi.excludedCategories.length > 0);
    assert.ok(chi.excludedCategories.includes('NON-CRIMINAL'));
  });

  it('NYC and LA have no excluded categories', () => {
    assert.deepEqual(getCrimeCityConfig('new-york').excludedCategories, []);
    assert.deepEqual(getCrimeCityConfig('los-angeles').excludedCategories, []);
  });

  it('Seattle excludes 999 and NOT_A_CRIME categories', () => {
    const sea = getCrimeCityConfig('seattle');
    assert.ok(sea.excludedCategories.includes('999'));
    assert.ok(sea.excludedCategories.includes('NOT_A_CRIME'));
  });

  it('Dallas uses nested geocoded_column for lat/lng', () => {
    const dal = getCrimeCityConfig('dallas');
    assert.equal(dal.fields.latitude, 'geocoded_column.latitude');
    assert.equal(dal.fields.longitude, 'geocoded_column.longitude');
  });

  it('Cincinnati uses latitude_x/longitude_x fields', () => {
    const cin = getCrimeCityConfig('cincinnati');
    assert.equal(cin.fields.latitude, 'latitude_x');
    assert.equal(cin.fields.longitude, 'longitude_x');
  });

  it('resolves suffixed slugs (e.g. san-francisco-us)', () => {
    const sf = getCrimeCityConfig('san-francisco-us');
    assert.ok(sf, 'should resolve san-francisco-us');
    assert.equal(sf.slug, 'san-francisco');

    const la = getCrimeCityConfig('los-angeles-us');
    assert.ok(la, 'should resolve los-angeles-us');
    assert.equal(la.slug, 'los-angeles');

    assert.equal(getCrimeCityConfig('unknown-city-us'), undefined);
  });

  it('does not false-match prefix slugs (e.g. chicago-heights)', () => {
    assert.equal(getCrimeCityConfig('chicago-heights'), undefined);
    assert.equal(getCrimeCityConfig('dallas-fort-worth'), undefined);
    assert.equal(getCrimeCityConfig('new-york-city'), undefined);
  });
});
