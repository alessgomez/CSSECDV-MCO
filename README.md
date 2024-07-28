# CSSECDV MCO: The Hungry Sibs
## Contents
- [Controller](https://github.com/alessgomez/CSSECDV-MCO/tree/main/controllers): contains all callback functions for server responses to client requests
- [Public](https://github.com/alessgomez/CSSECDV-MCO/tree/main/public): contains static assets such as CSS, JS, images, and font files
- [Routes](https://github.com/alessgomez/CSSECDV-MCO/tree/main/routes): contains the server responses for HTTP method requests to a specific path in the server
- [Views](https://github.com/alessgomez/CSSECDV-MCO/tree/main/views): contains all handlebars files rendered by the server
- [index.js](https://github.com/alessgomez/CSSECDV-MCO/blob/main/index.js): the main file used to execute the web application

## Follow the steps below to run the application locally:
1. Clone the repository or download and extract the zipped folder.
2. Open a command prompt/terminal and navigate to the project folder.
4. Install the necessary NPM libraries by running `npm install`.
4. Ensure that MySQL Server is installed and a connection instance is active.
5. Execute the SQL script [`the_hungry_sibs.sql`](https://github.com/alessgomez/CSSECDV-MCO/blob/main/the_hungry_sibs.sql) in your MySQL server instance to create the schema and its corresponding tables, as well as preload the default admin account.
6. In the `index.js` and `db.js` files, modify the `options` and `pool` objects respectively to match your MySQL Server host, user, and/or password configurations.
7. Execute `node index.js` or `npm run start` to run the application.
8. Navigate to `localhost:3000` on the browser to access the web application.

## NPM Packages and Third-Party Libraries
### NPM
- express
- hbs
- mysql2
- express-handlebars
- express-session
- express-mysql-session
- connect-flash
- axios
- rate-limiter-flexible
- nodemailer
- uuid
- bcrypt
- sharp
- multer
- winston

## Dummy Credentials
### Admin Account
- **Email:** hannah.regine.fong@gmail.com
- **Password:** JohnD0e!
### User Accounts
- **Password for all:** C4sh4y1!