import { drizzle } from "drizzle-orm/node-postgres";

export type Database = ReturnType<typeof drizzle>;
export * from "./schema";
