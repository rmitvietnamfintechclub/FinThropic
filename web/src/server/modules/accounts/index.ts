import "server-only";

// The only door into the accounts module. Other modules import from here, never from inner folders.
export type * from "./interfaces/accounts.interface";
