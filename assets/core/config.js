/* config.js: where usage, errors and problem reports are sent.
   Leave both empty and nothing is sent anywhere (the tools work exactly the same).
   The anon key is MEANT to be public. It only works because the database is locked down
   (see sql/001_core_tables.sql). NEVER put a service_role key in here. */
export const CONFIG = {
  url: '',      // e.g. 'https://abcdefgh.supabase.co'
  anonKey: '',  // the project's "anon public" key
};
