const db = require("../db.js");
const home_controller = {

    getHome: function (req, res) {
        const data = {
            style: ["navbar", "index"],
            script: ["index"], 
            bestSellers: [],
            bag: {}
        }

        res.render("index", data);

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