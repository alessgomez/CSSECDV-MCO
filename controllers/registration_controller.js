const { getConnectionFromPool, performQuery } = require('../db');

async function registerAccount(connection, newAccount) {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT * FROM accounts WHERE email = ?';
        connection.query(sql, [newAccount.email], async (error, results) => {
            if (error) {
                reject(error);
            } else {
                if (results.length === 0) {
                    // TODO: Salt & hash the password

                    const sql = 'INSERT INTO accounts (firstName, lastName, email, password, phoneNumber, role, dateCreated) VALUES (?, ?, ?, ?, ?, ?, ?)';
                    const values = [newAccount.first, newAccount.last, newAccount.email, newAccount.pw, newAccount.number, 'USER', new Date()];

                    connection.query(sql, values, async (error, results) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(results); // Account successfully registered
                        }
                    });
                } else {
                    resolve(null); // Account with the given email already exists
                }
            }
        })
    });
}

const registration_controller = {
    
    getRegister: function (req, res) {
        res.render("register");
    },

    postAddAccount: async (req, res) => {
    var newAccount = {
        first: req.body.firstname,
        last: req.body.lastname,
        email: req.body.email,
        pw: req.body.psw,
        number: req.body.contactno
        //var profilePhoto = req.body.profilePhoto;
    }
    //const saltRounds = 10;

    try {
        let connection = await getConnectionFromPool();
        const account = await registerAccount(connection, newAccount);

        if (account === null) {
            req.flash('error_msg', 'This account already exists.');
            return res.redirect('/register');
        } else {
            //TODO: add new bag for new user
            req.flash('success_msg', 'Account successfully registered. You may log in.');
            return res.redirect('/login');
        }
    } catch (error) {
        console.error('Error during account registration:', error);
        req.flash('error_msg', 'An error occurred during registration. Please try again.');
        return res.redirect('/login');
    }

    //db.query()

    // db.findMany(Account, {}, "", function(result){
    //     id = result.length+1;
    //     db.findOne(Account, {email: email}, {email: 1}, function(result) {
    //         if (result == null)
    //         {
    //             bcrypt.hash(pw, saltRounds, (err, hashed) => {
    //                 if (!err)
    //                     Account.create({userID: id, firstName: first, lastName: last, email: email, password: hashed,
    //                     contactNumber: number, completeAddress: address, seniorID: senior, pwdID: pwd}, function(error, result) {
    //                         req.session.user = result.userID;
    //                         req.session.name = result.firstName + " " + result.lastName;

    //                         console.log(req.session);

    //                         //add new bag for new user
    //                         var bag = {
    //                             userId: req.session.user,
    //                             orderItems: [],
    //                             subtotal: 0,
    //                             deliveryFee: 50,
    //                             total: 0 
    //                         }
                            
    //                         db.insertOne(Bag, bag, function(){});

    //                         res.redirect('/');
    //                     });
    //             });
    //         }
    //         else
    //         {
    //             req.flash('error_msg', 'This account already exists.');
    //             res.redirect('/register');
    //         }
    //     });
    // });
    }

}

module.exports = registration_controller;