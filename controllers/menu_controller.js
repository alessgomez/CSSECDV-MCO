const { getConnectionFromPool, logPoolStats } = require('../db');

const menu_controller = {
    getMenu: async (req, res) => {
        let connection = await getConnectionFromPool();

        try {
            var main = {
                id: 'main',
                category: 'MAIN DISHES',
                products: []
            }

            var snack = {
                id: 'snack',
                category: 'SNACKS',
                products: []
            }

            var dnd = {
                id: 'dnd',
                category: 'DESSERTS & DRINKS',
                products: []
            }
            
            const sql = "SELECT * FROM products ORDER BY price";
            connection.query(sql, async (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    for (i = 0; i < results.length; i++) {
                        if(results[i].category == 'main') 
                            main.products.push(results[i]);
                        else if(results[i].category == 'snack') 
                            snack.products.push(results[i]);
                        else if(results[i].category == 'drink' || results[i].category == 'dessert')
                            dnd.products.push(results[i]);
                    }

                    const menuPageData = {
                        style: ["navbar", "menu"],
                        topbar: true,
                        category: [main, snack, dnd], 
                        bag: req.bag
                    }
            
                    res.render("menu", menuPageData);
                }
            })
        } catch (error) {
            console.log(error);
        } finally {
            if (connection)
                connection.release();
        }
    }
}

module.exports = menu_controller;