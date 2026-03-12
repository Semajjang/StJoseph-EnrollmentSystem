export interface PhilippineAddressOption {
  code: string;
  name: string;
}

const PSGC_API_BASE_URL = 'https://psgc.gitlab.io/api';

const normalizeOptions = (value: unknown): PhilippineAddressOption[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const nextEntry = entry as Record<string, unknown>;
      const code = typeof nextEntry.code === 'string' ? nextEntry.code : '';
      const name = typeof nextEntry.name === 'string' ? nextEntry.name : '';

      if (!code || !name) {
        return null;
      }

      return {
        code,
        name
      };
    })
    .filter((entry): entry is PhilippineAddressOption => entry !== null)
    .sort((left, right) => left.name.localeCompare(right.name));
};

const fetchPhilippineAddressOptions = async (path: string) => {
  const response = await fetch(`${PSGC_API_BASE_URL}${path}`);

  if (!response.ok) {
    throw new Error(`Failed to load address data (${response.status}).`);
  }

  const data = (await response.json()) as unknown;
  return normalizeOptions(data);
};

export const fetchRegions = () => fetchPhilippineAddressOptions('/regions/');

export const fetchProvincesByRegion = (regionCode: string) =>
  fetchPhilippineAddressOptions(`/regions/${encodeURIComponent(regionCode)}/provinces/`);

export const fetchCitiesMunicipalitiesByRegion = (regionCode: string) =>
  fetchPhilippineAddressOptions(`/regions/${encodeURIComponent(regionCode)}/cities-municipalities/`);

export const fetchCitiesMunicipalitiesByProvince = (provinceCode: string) =>
  fetchPhilippineAddressOptions(`/provinces/${encodeURIComponent(provinceCode)}/cities-municipalities/`);

export const fetchBarangaysByCityMunicipality = (cityMunicipalityCode: string) =>
  fetchPhilippineAddressOptions(`/cities-municipalities/${encodeURIComponent(cityMunicipalityCode)}/barangays/`);