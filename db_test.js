const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://ecommerce_user:ecommerce_pass@localhost:5432/ecommerce_dev'
});
client.connect()
  .then(() => { console.log("Connected dev successfully!"); client.end(); })
  .catch(e => console.error("Dev error:", e.message));

const client2 = new Client({
  connectionString: 'postgresql://ecommerce_user:ecommerce_pass@localhost:5433/ecommerce_test'
});
client2.connect()
  .then(() => { console.log("Connected test successfully!"); client2.end(); })
  .catch(e => console.error("Test error:", e.message));
