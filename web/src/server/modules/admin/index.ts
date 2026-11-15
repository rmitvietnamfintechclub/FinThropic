import "server-only";

// The only door into the admin module. Other modules import from here, never from inner folders.
export type * from "./interfaces/admin.interface";
