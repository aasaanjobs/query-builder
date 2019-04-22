import * as tg from "generic-type-guard";

export interface DistanceFilter {
    lat: number;
    lon: number;
    range: string;
}

export const isDistanceFilter: tg.TypeGuard<DistanceFilter> = 
    new tg.IsInterface()
    .withProperty("lat", tg.isNumber)
    .withProperty("lon", tg.isNumber)
    .withProperty("range", tg.isString)
    .get();
    