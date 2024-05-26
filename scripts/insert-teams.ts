// import { hockey } from '../src/data/hockey';

// import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
// import { teams } from '../schema/teams';

const client = new Client({
  connectionString: process.env['DATABASE_URL']
});

await client.connect();
// const db = drizzle(client);

// const values = [].map(x => ({
//   ...x,
//   sport: 'hockey' as const,
//   lon: `${x.lon}`,
//   lat: `${x.lat}`
// }));

// db.insert(teams)
//   .values(values)
//   .returning()
//   .execute()
//   .catch(e => console.log(e))
//   .then(d => {
//     if (d) {
//       console.log('rows', d.length);
//     }
//     console.log(hockey.length);
//     client.end();
//   });
