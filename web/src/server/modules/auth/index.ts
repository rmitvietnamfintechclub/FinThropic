import "server-only";

// The only door into the auth module. Other modules import from here, never from inner folders.
export type * from "./interfaces/auth.interface";
