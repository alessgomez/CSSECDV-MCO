const express = require("express");
const exphbs = require("express-handlebars");
const routes = require("./routes/routes.js");

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
	database:'the_hungry_sibs'
};
const sessionStore = new MySQLStore(options);

app.set("view engine", "hbs");
app.engine("hbs", exphbs.engine({extname: "hbs"}));
app.use(express.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
    key: 'thehungrycookie',
    secret: 'thehungrysecret',
    store: sessionStore,
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false, // change to true wafter converting to https
        maxAge: 1000 * 60 * 60, // 1 hour
        httpOnly: true,
        sameSite: 'strict' // cookeis only included when navigating within same site to mitigate CSRF attacks
    }
}));

app.use(flash());

app.use((req, res, next) => {
    res.locals.error_msg= req.flash('error_msg');
    res.locals.success_msg= req.flash('success_msg');
    next();
});

app.use("/", routes);

app.listen(port, function() {
    console.log("Listening to port " + port);
});
