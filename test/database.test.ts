import { describe, expect, it } from 'vitest';
import { migrate, openDatabase } from '../src/database.js';

describe('migrations', () => {
  it('are idempotent and create the tasks table', () => {
    const database = openDatabase(':memory:');
    migrate(database);
    expect(
      database
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='tasks'",
        )
        .get(),
    ).toBeTruthy();
    expect(
      (
        database.prepare('SELECT COUNT(*) AS count FROM migrations').get() as {
          count: number;
        }
      ).count,
    ).toBe(1);
    database.close();
  });
});
