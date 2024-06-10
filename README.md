# CSSECDV MCO: The Hungry Sibs
## Contents
- [Controller](https://github.com/alessgomez/CSSECDV-MCO/tree/main/controllers): contains all callback functions for server responses to client requests
- [Public](https://github.com/alessgomez/CSSECDV-MCO/tree/main/public): contains static assets such as CSS, JS, images, and font files
- [Routes](https://github.com/alessgomez/CSSECDV-MCO/tree/main/routes): contains the server responses for HTTP method requests to a specific path in the server
- [Views](https://github.com/alessgomez/CSSECDV-MCO/tree/main/views): contains all handlebars files rendered by the server
- [index.js](https://github.com/alessgomez/CSSECDV-MCO/blob/main/index.js): the main file used to execute the web application

## Follow the steps below to run the application locally:
1. Clone the repository or download the zipped folder.
2. Open a command prompt/terminal and navigate to the project folder.
4. Install the necessary NPM libraries by running `npm install`.
4. Make sure that MySQL Server is installed and running.
5. Execute the SQL script [`the_hungry_sibs.sql`](https://github.com/alessgomez/CSSECDV-MCO/blob/main/the_hungry_sibs.sql) to create the schema and its corresponding tables, as well as preload the default admin account.
6. To run the application, execute `node index.js`.
7. Navigate to `localhost:3000` on the browser to access the web application.

## NPM Packages and Third-Party Libraries
### NPM
- bcrypt
- connect-flash
- express
- express-handlebars
- express-session
- hbs
- mysql
- express-mysql-session
- axios
- rate-limiter-flexible
- nodemailer
- uuid
### Third-Party
- Bootstrap

## Dummy Credentials
### Admin Account
- **EMAIL:** johndoe@thehungrysibs.com
- **PASSWORD:** JohnD0e!
### User Accounts
- **PASSWORD FOR ALL:** C4sh4y1!