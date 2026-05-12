import { ValueTransformer } from 'typeorm';

// Postgres numeric columns are returned as strings by node-postgres.
// Apply this transformer to fields used in arithmetic (e.g. quantities)
// so they read back as JS numbers and += / -= don't string-concat.
export const numericTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) =>
    value === null || value === undefined ? value : Number(value),
};
