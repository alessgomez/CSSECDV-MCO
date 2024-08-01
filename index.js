const express = require("express");
const exphbs = require("express-handlebars");
const routes = require("./routes/routes.js");
const fs = require("fs");
const path = require("path");

const app = express();
const port = process.env.PORT || 10000;
const session = require('express-session');
const flash = require('connect-flash');
const MySQLStore = require('express-mysql-session')(session);
const options = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME,
    clearExpired: true,
    checkExpirationInterval: 1000 * 60 * 5, 
    expiration: 1000 * 60 * 15,
    connectTimeout: 10000,
};
const sessionStore = new MySQLStore(options);

app.set("view engine", "hbs");
app.engine("hbs", exphbs.engine({extname: "hbs"}));
app.use(express.urlencoded({extended: true}));
app.use(express.static("public"));
app.enable('trust proxy');

app.use(session({
    key: process.env.SESSION_KEY,
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    name: process.env.SESSION_NAME,
    cookie: {
        secure: true, 
        maxAge: 1000 * 60 * 15, 
        httpOnly: true,
        sameSite: 'none'
    }
}));

app.use(flash());

app.use(function(req, res, next) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store')
    next();
});

app.use((req, res, next) => {
    res.locals.error_msg= req.flash('error_msg');
    res.locals.success_msg= req.flash('success_msg');
    next();
});

app.use("/", routes);

app.listen(port, function() {
    console.log(`Server is running on port ${port}`);
}).on('error', (err) => {
    logger.error('Error when starting app', {
        meta: {
            event: 'APP_START_ERROR',
            error: err,
        }
      });

    console.error('Server error:', err);
});

