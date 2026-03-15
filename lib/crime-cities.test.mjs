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
    assert.equal(slugs.length, 4);
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
});
