export type CrimeCityFieldMap = {
  datetime: string;
  category: string;
  subcategory: string;
  neighborhood: string;
  latitude: string;
  longitude: string;
};

export type CrimeCityConfig = {
  slug: string;
  label: string;
  host: string;
  datasetId: string;
  fields: CrimeCityFieldMap;
  excludedCategories: string[];
  appTokenEnvVar: string;
  dateFilterField: string;
  providerName: string;
  portalBaseUrl: string;
};

const CRIME_CITIES: Record<string, CrimeCityConfig> = {
  'san-francisco': {
    slug: 'san-francisco',
    label: 'San Francisco',
    host: 'data.sfgov.org',
    datasetId: 'wg3w-h783',
    fields: {
      datetime: 'incident_datetime',
      category: 'incident_category',
      subcategory: 'incident_subcategory',
      neighborhood: 'analysis_neighborhood',
      latitude: 'latitude',
      longitude: 'longitude',
    },
    excludedCategories: [
      'Non-Criminal',
      'Case Closure',
      'Lost Property',
      'Courtesy Report',
      'Recovered Vehicle',
    ],
    appTokenEnvVar: 'SFGOV_APP_TOKEN',
    dateFilterField: 'incident_date',
    providerName: 'SF Open Data',
    portalBaseUrl: 'https://data.sfgov.org',
  },
  'new-york': {
    slug: 'new-york',
    label: 'New York City',
    host: 'data.cityofnewyork.us',
    datasetId: '5uac-w243',
    fields: {
      datetime: 'cmplnt_fr_dt',
      category: 'ofns_desc',
      subcategory: 'law_cat_cd',
      neighborhood: 'boro_nm',
      latitude: 'latitude',
      longitude: 'longitude',
    },
    excludedCategories: [],
    appTokenEnvVar: 'NYC_APP_TOKEN',
    dateFilterField: 'cmplnt_fr_dt',
    providerName: 'NYC Open Data',
    portalBaseUrl: 'https://data.cityofnewyork.us',
  },
  'los-angeles': {
    slug: 'los-angeles',
    label: 'Los Angeles',
    host: 'data.lacity.org',
    datasetId: '2nrs-mtv8',
    fields: {
      datetime: 'date_occ',
      category: 'crm_cd_desc',
      subcategory: '',
      neighborhood: 'area_name',
      latitude: 'lat',
      longitude: 'lon',
    },
    excludedCategories: [],
    appTokenEnvVar: 'LA_APP_TOKEN',
    dateFilterField: 'date_occ',
    providerName: 'LA Open Data',
    portalBaseUrl: 'https://data.lacity.org',
  },
  chicago: {
    slug: 'chicago',
    label: 'Chicago',
    host: 'data.cityofchicago.org',
    datasetId: 'ijzp-q8t2',
    fields: {
      datetime: 'date',
      category: 'primary_type',
      subcategory: 'description',
      neighborhood: 'location_description',
      latitude: 'latitude',
      longitude: 'longitude',
    },
    excludedCategories: [
      'NON-CRIMINAL',
      'NON - CRIMINAL',
      'NON-CRIMINAL (SUBJECT SPECIFIED)',
    ],
    appTokenEnvVar: 'CHICAGO_APP_TOKEN',
    dateFilterField: 'date',
    providerName: 'Chicago Data Portal',
    portalBaseUrl: 'https://data.cityofchicago.org',
  },
};

const DEFAULT_CITY_SLUG = 'san-francisco';

export function getCrimeCityConfig(slug: string): CrimeCityConfig | undefined {
  return CRIME_CITIES[slug];
}

export function getDefaultCrimeCitySlug(): string {
  return DEFAULT_CITY_SLUG;
}

export function getAllCrimeCitySlugs(): string[] {
  return Object.keys(CRIME_CITIES);
}
