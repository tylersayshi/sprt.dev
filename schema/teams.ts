import {
  pgTable,
  serial,
  text,
  numeric,
  varchar,
  pgEnum
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-typebox';
import type { Static } from '@sinclair/typebox';

export const sportEnum = pgEnum('sport', [
  'hockey',
  'football',
  'baseball',
  'basketball'
]);

export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  sport: sportEnum('sport').notNull(),
  lat: numeric('lat', { precision: 10, scale: 7 }).notNull(),
  lon: numeric('lon', { precision: 10, scale: 7 }).notNull(),
  name: text('name').notNull(),
  abbr: varchar('abbr', { length: 5 }).notNull(),
  city: varchar('city', { length: 50 }).notNull()
});

const insertSchema = createInsertSchema(teams);
export type TeamsInsert = Static<typeof insertSchema>;

const selectSchema = createSelectSchema(teams);
export type TeamsSelect = Static<typeof selectSchema>;
