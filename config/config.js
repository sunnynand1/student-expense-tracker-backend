require('dotenv').config();

const dbConfig = {
  username: 'root',
  password: 'UwbuTjEKJxTEgUsponAZcUwtEKlJlxwM',
  database: 'railway',
  host: 'turntable.proxy.rlwy.net',
  port: 11148,
  dialect: 'mysql',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
};

module.exports = {
  development: {
    ...dbConfig,
    logging: console.log
  },
  test: {
    ...dbConfig,
    logging: false
  },
  production: {
    ...dbConfig,
    logging: false
  }
};
