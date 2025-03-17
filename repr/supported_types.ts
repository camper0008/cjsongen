export const supportedRawTypes = ["char*", "int64_t", "bool"] as const;
export type RawType = typeof supportedRawTypes[number];
