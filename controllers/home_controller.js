const {getConnectionFromPool} = require('../db');
const home_controller = {

    getHome: async (req, res) => {
        const userPageData = {
            style: ["navbar", "index"],
            script: ["index"], 
            bestSellers: [],
            bag: {}
        }

        const adminPageData = {
            style: ["navbar", "index"],
            isAdmin: true,
        }

        let connection = await getConnectionFromPool();

        try {
            if (req.session.accountId) {
                connection.query("SELECT * FROM accounts WHERE accountId = ?", [req.session.accountId], function(err, results) {
                    if (err) throw err;
        
                    if (results[0].role === "ADMIN") {
                        connection.query("SELECT * FROM accounts WHERE role = ?", ["USER"], function(error, results) {
                            if (error) {
                                throw error;
                            } else {
                                adminPageData.users = results;
                                res.render("admin", adminPageData);
                            }
                        });
                    }
                    else
                        res.render("index", userPageData);
                });
            }
        } catch (error) {
            console.log(error);
        } finally {
            if (connection)
                connection.release();
        }

        // let p = new Promise((resolve, reject) =>{
        //     return getBagContents(req.session.user, resolve, reject);
        // })

        // p.then((bag) => {
        //     data.bag = bag;
        //     BestSeller.find().populate("productId").exec(function(err, results){
        //         if (err) return handleError(err);
    
        //         for (var i=0;i < results.length; i++)
        //         {
        //             var productObj = {
        //                 name: results[i].productId.name,
        //                 price: parseFloat(results[i].productId.price).toFixed(2),
        //                 image: results[i].productId.image,
        //                 id: results[i].productId.id
        //             };
    
        //             data.bestSellers.push(productObj);
        //         }
        //     });
        //     res.render("index", data);
        // }).catch((message) => {
        //     console.log("This is in catch: " + message);
        // })
    }

}

module.exports = home_controller;