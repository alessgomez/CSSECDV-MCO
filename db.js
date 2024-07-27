var mysql = require('mysql2');
const fs = require("fs");
require('dotenv').config();

const pool = mysql.createPool({
	connectionLimit: 100,
	host: process.env.DB_HOST,
	user: process.env.DB_USER,
	port: process.env.DB_PORT,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME,
  });

  async function getConnectionFromPool() {
	return new Promise((resolve, reject) => {
	  pool.getConnection((error, connection) => {
		if (error) {
		  switch (error.code) {
			case 'PROTOCOL_CONNECTION_LOST':
				reject(new Error('Database connection was closed.'));
				break;
			case 'ER_CON_COUNT_ERROR':
				reject(new Error('Database has too many connections.'));
				break;
			case 'ECONNREFUSED':
				reject(new Error('Database connection was refused.'));
				break;
			case 'ETIMEDOUT':
				reject(new Error('Database connection timed out.'));
				break;
			default:
			  reject(error);
		  }
		} else {
		  resolve(connection);
		}
	  });
	});
  }
  

function logPoolStats() {
	console.log('Pool Stats:');
	console.log('Total Connections:', pool._allConnections.length);
	console.log('Free Connections:', pool._freeConnections.length);
	console.log('Waiting Clients:', pool._acquiringConnections.length);
}
  
module.exports = { getConnectionFromPool, logPoolStats };

 