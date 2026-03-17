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
  seattle: {
    slug: 'seattle',
    label: 'Seattle',
    host: 'data.seattle.gov',
    datasetId: 'tazs-3rd5',
    fields: {
      datetime: 'offense_date',
      category: 'offense_sub_category',
      subcategory: 'nibrs_offense_code_description',
      neighborhood: 'precinct',
      latitude: 'latitude',
      longitude: 'longitude',
    },
    excludedCategories: ['999', 'NOT_A_CRIME'],
    appTokenEnvVar: 'SEATTLE_APP_TOKEN',
    dateFilterField: 'offense_date',
    providerName: 'Seattle Open Data',
    portalBaseUrl: 'https://data.seattle.gov',
  },
  cincinnati: {
    slug: 'cincinnati',
    label: 'Cincinnati',
    host: 'data.cincinnati-oh.gov',
    datasetId: 'k59e-2pvf',
    fields: {
      datetime: 'date_from',
      category: 'offense',
      subcategory: 'ucr_group',
      neighborhood: 'cpd_neighborhood',
      latitude: 'latitude_x',
      longitude: 'longitude_x',
    },
    excludedCategories: [],
    appTokenEnvVar: 'CINCINNATI_APP_TOKEN',
    dateFilterField: 'date_from',
    providerName: 'Cincinnati Open Data',
    portalBaseUrl: 'https://data.cincinnati-oh.gov',
  },
  dallas: {
    slug: 'dallas',
    label: 'Dallas',
    host: 'www.dallasopendata.com',
    datasetId: 'qv6i-rri7',
    fields: {
      datetime: 'date1',
      category: 'offincident',
      subcategory: 'nibrs_crime',
      neighborhood: 'division',
      latitude: 'geocoded_column.latitude',
      longitude: 'geocoded_column.longitude',
    },
    excludedCategories: [],
    appTokenEnvVar: 'DALLAS_APP_TOKEN',
    dateFilterField: 'date1',
    providerName: 'Dallas Open Data',
    portalBaseUrl: 'https://www.dallasopendata.com',
  },
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
  if (CRIME_CITIES[slug]) return CRIME_CITIES[slug];
  return CRIME_CITIES[stripCountrySuffix(slug)];
}

/**
 * Strip a trailing 2-letter country code suffix (e.g. "san-francisco-us" → "san-francisco").
 * Returns the input unchanged if it doesn't match the pattern.
 */
function stripCountrySuffix(slug: string): string {
  const match = slug.match(/^(.+)-[a-z]{2}$/);
  return match ? match[1] : slug;
}

export function getDefaultCrimeCitySlug(): string {
  return DEFAULT_CITY_SLUG;
}

export function getAllCrimeCitySlugs(): string[] {
  return Object.keys(CRIME_CITIES);
}
