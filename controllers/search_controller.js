const {getConnectionFromPool} = require('../db');
const { fileFilter, getMimeType, sanitizeImage } = require('./registration_controller.js')
const fs = require('fs');
const sharp = require('sharp');
const multer = require('multer');
const storage = multer.memoryStorage();
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);
const debug = process.env.DEBUG;
const logger = require('../logger');
const { getSessionDataEntry } = require('./login_controller.js');
const geoip = require('geoip-lite');


function searchValid (query) {
    const searchRegex = /^[a-zA-Z0-9() \n]*$/;
    return searchRegex.test(query) && query.length <= 50;
} 

const search_controller = {

    getSearchPage: async (req, res) => {
        const searchPageData = {
            style: ["navbar", "index", "search"],
        }

        let connection;
        let sessionData;

        try {
            connection = await getConnectionFromPool();
            sessionData = await getSessionDataEntry(connection, req.session.id)

            if (searchValid(req.query.q)){
                const sql = `SELECT productId, name, price, imageFilename 
                             FROM products 
                             WHERE isArchived = 0 AND name LIKE ?
                             ORDER BY category ASC`
                values = [`%${req.query.q}%`];

                connection.query(sql, values, async (error, results) => {
                    if(error) {
                        throw error;
                    } else {
                        searchPageData.nResults = results.length;
                        
                        searchPageData.q = DOMPurify.sanitize(req.query.q);

                        searchPageData.results = results.map(result => {
                            return {
                                image: "/images/products/" + DOMPurify.sanitize(result.imageFilename),
                                name: DOMPurify.sanitize(result.name),
                                price: parseFloat(result.price),
                                id: DOMPurify.sanitize(result.productId),
                            };
                        });

                        res.render('search', searchPageData);
                    }
                });
            } else{
                throw new Error('Invalid search query.');
            }
        } catch(error){
            if (debug)
                console.error('Error searching for product: ', error)
            else    
                console.error('An error occurred.')

            logger.error('Error when searching for a product', {
                meta: {
                    event: 'SEARCH_PRODUCT_ERROR',
                    method: req.method,
                    url: req.originalUrl,
                    accountId: sessionData.accountId,
                    errorMessage: error.message, 
                    errorStack: error.stack, 
                    sourceIp: req.ip,
                    userAgent: req.headers['user-agent'],
                    hostname: req.hostname,
                    protocol: req.protocol,
                    port: req.socket.localPort,
                    geo:geoip.lookup(req.ip)
                }
            });

            return res.redirect('/menu');
        } finally {
            if (connection)
                connection.release();
        }
    }
}


module.exports = search_controller;