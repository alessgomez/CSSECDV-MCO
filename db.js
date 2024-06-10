var mysql = require('mysql');
// var connection = mysql.createConnection({
// 	host:'localhost',
// 	user:'root',
// 	password:'2002Days!',
// 	database:'the_hungry_sibs'
// });
// connection.connect(function(error){
// 	if(!!error) {
// 		console.log(error);
// 	} else {
// 		console.log('Connected..!');
// 	}
// });

const pool = mysql.createPool({
	connectionLimit: 100,
	host:'localhost',
	user:'root',
	database:'the_hungry_sibs',
	password:'120301'
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

 