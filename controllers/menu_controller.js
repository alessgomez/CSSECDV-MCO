const { getConnectionFromPool } = require('../db');
const { getSessionDataEntry } = require('./login_controller');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('config.json'));
const debug = config.DEBUG;
const logger = require('../logger');

const menu_controller = {
    getMenu: async (req, res) => {
        const main = {
            id: 'main',
            category: 'MAIN DISHES',
            products: []
        }

        const snack = {
            id: 'snack',
            category: 'SNACKS',
            products: []
        }

        const dnd = {
            id: 'dnd',
            category: 'DESSERTS & DRINKS',
            products: []
        }
    
        const data = {
            style: ["navbar", "menu"],
            topbar: true,
            category: [main, snack, dnd], 
            bag: req.bag
        }

        let connection;
        let sessionData;

        try {
            connection = await getConnectionFromPool();
            sessionData = await getSessionDataEntry(connection, req.session.id);

            const query = "SELECT * FROM products WHERE isArchived = 0 ORDER BY price";

            const [results] = await connection.promise().query(query);

            if (results.length === 0) 
                throw new Error('No products found');

            results.forEach(product => {
                const sanitizedProduct = {
                    productId: DOMPurify.sanitize(product.productId),
                    name: DOMPurify.sanitize(product.name),
                    imageFilename: DOMPurify.sanitize(product.imageFilename),
                    price: DOMPurify.sanitize(product.price)
                }

                const category = DOMPurify.sanitize(product.category)

                if (category == "main")
                    main.products.push(sanitizedProduct);
                else if (category == "snack")
                    snack.products.push(sanitizedProduct);
                else if (category == "drink" || category == "dessert")
                    dnd.products.push(sanitizedProduct);
            })
            res.render("menu", data);
        } catch (error) {
            if (debug) 
                console.error('Error loading menu: ', error);
            else 
                console.error('An error occurred.');

            logger.error('Error when user attempted to view menu', {
                meta: {
                    event: 'VIEW_MENU_ERROR',
                    method: req.method,
                    url: req.originalUrl,
                    accountId: sessionData.accountId,
                    errorMessage: error.message, 
                    errorStack: error.stack, 
                    sourceIp: req.ip, 
                    userAgent: req.headers['user-agent']
                }
            });
            req.flash('error_msg', 'An error occurred. Please try again later.');
            res.redirect('/');
        } finally {
            if (connection)
                connection.release();
        }
    }
}

module.exports = menu_controller;