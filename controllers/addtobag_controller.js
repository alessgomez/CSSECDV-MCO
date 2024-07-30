const { getConnectionFromPool } = require('../db');
const { getSessionDataEntry } = require('./login_controller');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);
const fs = require('fs');
const debug = process.env.DEBUG;
const logger = require('../logger');

const addtobag_controller = {
    getAddToBag: async (req, res) => {
        const data = {
            style: ["bootstrap", "navbar", "addtobag"],
            script: ["bootstrap", "addtobag"],
            bCustomizable: false,
            bag: req.bag,
            product: {}
        }

        const productId = req.params.id;

        let connection;
        let sessionData;
        try {
            connection = await getConnectionFromPool();
            sessionData = await getSessionDataEntry(connection, req.session.id);

            const sql = "SELECT name, price, productId, imageFilename FROM products WHERE productId = ? AND isArchived = 0;";
            const [results] = await connection.promise().query(sql, [productId])

            if (results.length === 0) 
                throw new Error('Product not found');

            const product = results[0];
            product.name = DOMPurify.sanitize(product.name);
            product.category = DOMPurify.sanitize(product.category);
            product.price = parseFloat(DOMPurify.sanitize(product.price)).toFixed(2);
            product.productId = DOMPurify.sanitize(product.productId);

            data.product = product;
            res.render('addtobag', data);
        }catch(error) {
            if (debug) 
                console.error('Error loading add to bag: ', error);
            else 
                console.error('An error occurred.')

            logger.error('Error attempting to load user add to bag page', {
                meta: {
                    event: 'VIEW_ADD_TO_BAG_ERROR',
                    method: req.method, 
                    url: req.originalUrl,
                    accountId: sessionData.accountId,
                    productId: productId,
                    error: error,
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

module.exports = addtobag_controller;