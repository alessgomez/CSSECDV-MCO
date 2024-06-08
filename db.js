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
	host:'localhost',
	user:'root',
	password:'2002Days!',
	database:'the_hungry_sibs'
  });

  function getConnectionFromPool() {
	return new Promise((resolve, reject) => {
	  pool.getConnection((error, connection) => {
		if (error) {
		  reject(error);
		} else {
		  resolve(connection);
		}
	  });
	});
  }
  
  function performQuery(connection, sql) {
	return new Promise((resolve, reject) => {
	  connection.query(sql, (error, results) => {
		if (error) {
		  reject(error);
		} else {
		  resolve(results);
		}
	  });
	});
  }
  
  module.exports = { getConnectionFromPool, performQuery };