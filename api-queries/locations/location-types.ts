export interface GenericLocationDetails {
    id: string;
    name: string;
    code: string;
    timezone: string;
    createdAt: string;
    updatedAt: string;
    status: 'ACTIVE' | 'INACTIVE';
}

export interface RegionDetails extends GenericLocationDetails {}

export interface SubRegionDetails extends RegionDetails {
    region: RegionDetails;
}

export interface CountryDetails extends SubRegionDetails {
    subRegion: SubRegionDetails;
}

export interface StateDetails extends CountryDetails {
    country: CountryDetails;
}

export interface DistrictDetails extends StateDetails {
    state: StateDetails;
}

export interface AreaDetails extends DistrictDetails {
    district: DistrictDetails;
}
