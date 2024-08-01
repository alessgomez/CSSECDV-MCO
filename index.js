const express = require("express");
const exphbs = require("express-handlebars");
const routes = require("./routes/routes.js");
const https = require("https");
const fs = require("fs");
const path = require("path");

const app = express();
const port = 3000;
const session = require('express-session');
const flash = require('connect-flash');
const MySQLStore = require('express-mysql-session')(session);
const options = {
    host: 'localhost',
    port: 3306,
    user:'root',
    password: '',
	database:'the_hungry_sibs',
    clearExpired: true,
    checkExpirationInterval: 1000 * 60 * 5, 
    expiration: 1000 * 60 * 60
};
const sessionStore = new MySQLStore(options);

const key = fs.readFileSync(path.join(__dirname, 'key.pem'));
const cert = fs.readFileSync(path.join(__dirname, 'cert.pem'));

const server = https.createServer({ key: key, cert: cert }, app);

app.set("view engine", "hbs");
app.engine("hbs", exphbs.engine({extname: "hbs"}));
app.use(express.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
    key: 'thehungrycookie',
    secret: 'thehungrysecret',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true, 
        maxAge: 1000 * 60 * 60, 
        httpOnly: true,
        sameSite: 'strict',
        domain: 'localhost',
        path: '/'
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

server.listen(port, function() {
    console.log("Listening to port " + port);
});
