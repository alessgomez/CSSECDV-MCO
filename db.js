var mysql = require('mysql2');

const pool = mysql.createPool({
	connectionLimit: 100,
	host:'localhost',
	user:'root',
	password: '',
	database:'the_hungry_sibs'
  });

  async function getConnectionFromPool() {
	return new Promise((resolve, reject) => {
	  pool.getConnection((error, connection) => {
		if (error) {
		  // Enhanced error handling with more informative messages
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

 