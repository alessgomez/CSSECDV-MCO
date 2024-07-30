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

const search_controller = {

    getSearchPage: async (req, res) => {
        const searchPageData = {
            style: ["navbar", "index", "search"],
        }

        let connection = await getConnectionFromPool();

        try {
            const sql = "SELECT productId, name, price, imageFilename FROM products WHERE isArchived = 0 AND name = ? ORDER BY category ASC"
            values = [req.query.q];
            connection.query(sql, values, async (error, results) => {
                if(error) {
                    throw error;
                } else {
                    searchPageData.nResults = results.length;

                    console.log(results.length);
                    
                    searchPageData.q = req.query.q;

                    searchPageData.results = results.map(result => {
                        console.log(result.name);
                        console.log(result.price);
                        console.log(result.productId);
                        console.log(result.imageFilename);
                        return {
                            image: "/images/products/" + result.imageFilename,
                            name: result.name,
                            price: result.price,
                            id: result.productId,
                        };
                        
                    });

                    res.render('search', searchPageData);
                }
            });
        } catch(error){
            console.log(error);
        } finally {
            if (connection)
                connection.release();
        }
    }
}


module.exports = search_controller;