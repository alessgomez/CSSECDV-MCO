const { getConnectionFromPool, logPoolStats } = require('../db');
const { getSessionDataEntry } = require('./login_controller');
const { v4: uuidv4 } = require('uuid');
const { JSDOM } = require('jsdom');
const createDOMPurify = require('dompurify');
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);
const geoip = require('geoip-lite');

const fs = require('fs');
const config = JSON.parse(fs.readFileSync('config.json'));
const debug = config.DEBUG;
const logger = require('../logger');

const checkUuidExists = (connection, newId, field) => {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT * FROM bagItems WHERE ? = ?';
        connection.query(sql, [field, newId], (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results.length > 0);
            }
        });
    });
}

async function getBagId(connection, accountId) {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT bagId FROM bag WHERE accountId = ?';
        connection.query(sql, [accountId], async(error, results) => {
            if (error) {
                reject(error);
            } else {
                if (results.length === 0) {
                    resolve(null);
                } else {
                    const bagId = results[0].bagId;
                    resolve(DOMPurify.sanitize(bagId));
                }
            }
        })
    })
}

async function getBagItems(connection, accountId) {
    try {
        var bagId = await getBagId(connection, accountId);
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM bag INNER JOIN bagItems ON bag.bagId = bagItems.bagId INNER JOIN products ON bagItems.productId = products.productId WHERE bag.bagId = ?;';
            connection.query(sql, [bagId], async(error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results);
                }
            })
        })
    } catch (error) {
        throw error;
    }
}

async function updateBag(connection, accountId) {
    try {
        var bagId = await getBagId(connection, accountId);
        var bagItems = await getBagItems(connection, accountId);
        
        return new Promise((resolve, reject) => {
            var subtotal = 0;
            var deliveryFee = 0;
            var total = 0;

            if (bagItems.length > 0) {
                deliveryFee = 50;
                for (var i = 0; i < bagItems.length; i++) {
                    subtotal += parseFloat(DOMPurify.sanitize(bagItems[i].totalPrice));
                }
                total = subtotal + deliveryFee;
            }

            const sql = 'UPDATE bag SET subtotal = ?, deliveryFee = ?, total = ? WHERE bagId = ?;';
            const values = [subtotal, deliveryFee, total, bagId];

            connection.query(sql, values, async (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve([subtotal, deliveryFee, total]);
                }
            })
        })
    } catch (error) {
        throw error;
    }
}

function validateUuid(str) {
    let regexUuidv4 = new RegExp(/^[0-9A-Fa-f]{8}(?:\-[0-9A-Fa-f]{4}){3}\-[0-9A-Fa-f]{12}$/);
    return regexUuidv4.test(str);
}

async function getProduct(connection, productId) {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT * FROM products WHERE productId = ?';
        connection.query(sql, [productId], async(error, results) => {
            if (error) {
                reject(error);
            } else {
                if (results.length === 0) {
                    resolve(null);
                } else {
                    resolve(results[0]);
                }
            }
        });
    });
}


async function validateAndCompleteDetails(newBagItem, connection) {

    try {
        newBagItem.quantity = parseInt(newBagItem.quantity);

        const isQuantityValid = !isNaN(newBagItem.quantity) && newBagItem.quantity > 0 && newBagItem.quantity <= 100;
        const isProductIdValid = validateUuid(newBagItem.productId);
    
        if (isQuantityValid && isProductIdValid) {
            const product = await getProduct(connection, newBagItem.productId);

            if (!product) 
                throw new Error('Product not found');

            newBagItem.totalPrice = newBagItem.quantity * parseFloat(DOMPurify.sanitize(product.price));
            return true;

        } else {
            return false;
        }

    } catch(error) {
        throw error;
    }

}

const bag_controller = {
    getBag: async (req, res, next) => {
        let connection;
        let sessionData;
        try {
            connection = await getConnectionFromPool();
            sessionData = await getSessionDataEntry(connection, req.session.id);

            var bagItems = await getBagItems(connection, sessionData.accountId);
            bag = {
                bagItems: [],
                subtotal: parseFloat(0).toFixed(2),
                deliveryFee: parseFloat(0).toFixed(2),
                total: parseFloat(0).toFixed(2)
            }

            if (bagItems.length > 0) {
                bag.subtotal = parseFloat(DOMPurify.sanitize(bagItems[0].subtotal)).toFixed(2);
                bag.deliveryFee = parseFloat(DOMPurify.sanitize(bagItems[0].deliveryFee)).toFixed(2);
                bag.total = parseFloat(DOMPurify.sanitize(bagItems[0].total)).toFixed(2);

                for (var i = 0; i < bagItems.length; i++) {
                    var bagItem = {
                        bagItemId: DOMPurify.sanitize(bagItems[i].bagItemId),
                        quantity: parseInt(DOMPurify.sanitize(bagItems[i].quantity)),
                        totalPrice: parseFloat(DOMPurify.sanitize(bagItems[i].totalPrice)).toFixed(2),
                        product: {
                            productId: DOMPurify.sanitize(bagItems[i].productId),
                            name: DOMPurify.sanitize(bagItems[i].name)
                        }
                    }
                    bag.bagItems.push(bagItem);
                }
            }

            req.bag = bag;
            return next();
        } catch(error) {
            if (debug)
                console.error('Error loading bag: ', error);
            else 
                console.error('An error occurred.');

            logger.error('Error when loading bag', {
                meta: {
                    event: 'GET_BAG_ERROR',
                    method: req.method,
                    url: req.originalUrl,
                    accountId: sessionData.accountId,
                    errorMessage: error.message, 
                    errorStack: error.stack, 
                    sourceIp: req.ip,
                    userAgent: req.headers['user-agent']
                }
            })

            res.status(500).send('Internal Server Error');
        } finally {
            if (connection)
                connection.release();
        }
    },

    postAddBagItem: async (req,res) => {
        let connection;
        let sessionData;
        try {
            connection = await getConnectionFromPool();
            sessionData = await getSessionDataEntry(connection, req.session.id);
            const bagId = await getBagId(connection, sessionData.accountId);

            if (!bagId)
                throw new Error('Bag not found');

            const newBagItem = {
                bagItemId: null,
                productId: DOMPurify.sanitize(req.body.productId),
                quantity: DOMPurify.sanitize(req.body.quantity),
                totalPrice: null,
                bagId: bagId
            }

            const newBagItemValid = await validateAndCompleteDetails(newBagItem, connection);

            if (!newBagItemValid) {
                throw new Error("Invalid bag item details.");
            } 

            let newId;
            let uuidExists = true;

            while(uuidExists) {
                newId = uuidv4();
                uuidExists = await checkUuidExists(connection, newId, 'bagItemId');
            }

            connection.beginTransaction(async(err) => {
                if (err) throw err;

                try {
                    const sql = 'INSERT INTO bagItems (bagItemId, productId, quantity, totalPrice, bagId) VALUES (?,?,?,?,?)';
                    const values = [newId, newBagItem.productId, newBagItem.quantity, newBagItem.totalPrice, newBagItem.bagId];

                    connection.query(sql, values, async(error, results) => {
                        if (error) {
                            throw error;
                        } else {
                            await updateBag(connection, sessionData.accountId);
                            connection.commit((err) => {
                                if (err) {
                                    return connection.rollback(() => {
                                        throw err;
                                    })
                                }
                                logger.info('User successfully added a bag item', {
                                    meta: {
                                        event: 'ADD_BAG_ITEM_SUCCESS',
                                        method: req.method,
                                        url: req.originalUrl,
                                        accountId: sessionData.accountId,
                                        bagItemId: newId,
                                        sourceIp: req.ip,
                                        userAgent: req.headers['user-agent']
                                    }
                                })
                                res.json({success:true});
                            })
                        }
                    })
                } catch (error) {
                    if (connection) {
                        connection.rollback(() => {
                            if (debug)
                                console.error('Error adding bag item: ', error);
                            else 
                                console.error('An error occurred.');
    
                            logger.error('Error when user attempted to add a bag item', {
                                meta: {
                                    event: 'ADD_BAG_ITEM_ERROR',
                                    method: req.method,
                                    url: req.originalUrl,
                                    accountId: sessionData.accountId,
                                    errorMessage: error.message, 
                                    errorStack: error.stack, 
                                    sourceIp: req.ip,
                                    userAgent: req.headers['user-agent']
                                }
                            })
                            return res.json({success:false});
                        })
                    } else {
                        if (debug)
                            console.error('Error adding bag item: ', error);
                        else 
                            console.error('An error occurred.');

                        logger.error('Error when user attempted to add a bag item', {
                            meta: {
                                event: 'ADD_BAG_ITEM_ERROR',
                                method: req.method,
                                url: req.originalUrl,
                                accountId: sessionData.accountId,
                                errorMessage: error.message, 
                                errorStack: error.stack, 
                                sourceIp: req.ip,
                                userAgent: req.headers['user-agent']
                            }
                        })
                        return res.json({success:false});
                    }
                } finally{
                    if (connection)
                        connection.release();
                }

            })
        } catch(error) {
            if (debug)
                console.error('Error starting the add to bag transaction: ', error);
            else 
                console.error('An error occurred.');

            logger.error('Error when starting an add to bag transaction', {
                meta: {
                    event: 'ADD_BAG_ITEM_ERROR',
                    method: req.method,
                    url: req.originalUrl,
                    accountId: sessionData.accountId,
                    errorMessage: error.message, 
                    errorStack: error.stack, 
                    sourceIp: req.ip,
                    userAgent: req.headers['user-agent']
                }
            })
            return res.json({success:false});
        } finally {
            if (connection)
                connection.release();
        }
    },

    getItemQuantity: async (req, res) => {
        let connection;
        let sessionData;
        try {
            connection = await getConnectionFromPool();
            sessionData = await getSessionDataEntry(connection, req.session.id);

            if (sessionData) {
                var bagId = await getBagId(connection, sessionData.accountId);

                const sql = 'SELECT * FROM bag INNER JOIN bagItems ON bag.bagId = bagItems.bagId WHERE bag.bagId = ?;';
                
                connection.query(sql, [DOMPurify.sanitize(bagId)], async(error, results) => {
                    if (error) {
                        reject(error);
                    } else {
                        res.send([results.length]);
                    }
                })
            }
            else {
                res.send([0]);
            }   
        } catch(error) {
            if (debug) 
                console.error('Error retrieving number of bag items: ', error);
            else
                console.error('An error occurred.');
            
            if (sessionData)
                var accountId = sessionData.accountId;

            logger.error('Error when attempting to retrieve number of bag items', {
                meta: {
                    event: 'GET_ITEM_QUANTITY_ERROR',
                    method: req.method,
                    url: req.originalUrl,
                    accountId: accountId,
                    errorMessage: error.message, 
                    errorStack: error.stack, 
                    sourceIp: req.ip,
                    userAgent: req.headers['user-agent']
                }
            })
            res.send([0]); //send 0 length by default to disable proceed button
        } finally {
            if (connection)
                connection.release();
        }
    },

    postAddQuantity: async (req, res) => {
        let connection;
        let sessionData;
        const bagItemId = DOMPurify.sanitize(req.body.bagItemId);

        try {
            connection = await getConnectionFromPool();
            sessionData = await getSessionDataEntry(connection, req.session.id);
            const bagId = await getBagId(connection, sessionData.accountId);

            if (!bagId)
                throw new Error('Bag not found');

            if (!validateUuid(bagItemId))
                throw new Error('Invalid bag item');

            const query = 'SELECT * FROM bagItems INNER JOIN products ON bagItems.productId = products.productId WHERE bagItemId = ?;';

            const [results] = await connection.promise().query(query, [bagItemId]);

            if (results.length === 0)
                throw new Error('Bag item not found');

            if (parseInt(DOMPurify.sanitize(results[0].quantity)) + 1 <= 100) {
                newQuantity = parseInt(DOMPurify.sanitize(results[0].quantity)) + 1;
                newTotalPrice = parseFloat(DOMPurify.sanitize(results[0].price)) * newQuantity;
                
                connection.beginTransaction(async(err) => {
                    if (err) throw err;
    
                    try {
                        const query = 'UPDATE bagItems SET quantity = ?, totalPrice = ? WHERE bagItemId = ?;';
                        const values = [newQuantity, newTotalPrice, bagItemId];
    
                        const[results] = await connection.promise().query(query, values);
    
                        const bagDetails = await updateBag(connection, sessionData.accountId);
    
                        connection.commit((err) => {
                            if (err) {
                                return connection.rollback(() => {
                                    throw err;
                                })
                            }
    
                            logger.info('User successfully added quantity of a bag item', {
                                meta: {
                                    event: 'ADD_QUANTITY_SUCCESS',
                                    method: req.method,
                                    url: req.originalUrl,
                                    accountId: sessionData.accountId,
                                    bagItemId: bagItemId,
                                    sourceIp: req.ip,
                                    userAgent: req.headers['user-agent']
                                }
                            });
    
                            var updatedBag = {
                                newQuantity: newQuantity,
                                newTotalPrice: newTotalPrice,
                                newSubtotal: bagDetails[0],
                                deliveryFee: bagDetails[1],
                                newTotal: bagDetails[2]
                            }
    
                            res.json({success: true, updatedBag:updatedBag});
                        })
                    } catch (error) {
                        connection.rollback(() => {
                            if (debug)
                                console.error('Error adding quantity to bag item: ', error);
                            else 
                                console.error('An error occurred.');
    
                            logger.error('Error when user attempted to add quantity to bag item', {
                                meta: {
                                    event: 'ADD_QUANTITY_ERROR',
                                    method: req.method,
                                    url: req.originalUrl,
                                    accountId: sessionData.accountId,
                                    bagItemId: bagItemId,
                                    sourceIp: req.ip,
                                    userAgent: req.headers['user-agent']
                                }
                            })
                            res.json({success:false})
                        })
                    } finally {
                        if (connection)
                            connection.release();
                    }
                })
            } else {
                res.json({success:false});
            }
        } catch(error) {
            if (connection) {
                connection.rollback(() => {
                    if (debug)
                        console.error('Error starting the add quantity transaction: ', error);
                    else 
                        console.error('An error occurred.');
    
                    logger.error('Error when starting an add quantity transaction', {
                        meta: {
                            event: 'ADD_QUANTITY_ERROR',
                            method: req.method,
                            url: req.originalUrl,
                            accountId: sessionData.accountId,
                            bagItemId: typeof bagItemId !== 'undefined' ? bagItemId : null,
                            sourceIp: req.ip,
                            userAgent: req.headers['user-agent'],
                            hostname: req.hostname,
                            protocol: req.protocol,
                            port: req.socket.localPort,
                            geo:geoip.lookup(req.ip)
                        }
                    })
                    res.json({success:false})
                })
            } else {
                if (debug)
                    console.error('Error starting the add quantity transaction: ', error);
                else 
                    console.error('An error occurred.');

                logger.error('Error when starting an add quantity transaction', {
                    meta: {
                        event: 'ADD_QUANTITY_ERROR',
                        method: req.method,
                        url: req.originalUrl,
                        accountId: sessionData.accountId,
                        bagItemId: typeof bagItemId !== 'undefined' ? bagItemId : null,
                        sourceIp: req.ip,
                        userAgent: req.headers['user-agent'],
                        hostname: req.hostname,
                        protocol: req.protocol,
                        port: req.socket.localPort,
                        geo:geoip.lookup(req.ip)
                    }
                })
                res.json({success:false})
            }
        } finally {
            if (connection)
                connection.release();
        }
    },

    postSubtractQuantity: async (req, res) => {
        let connection;
        let sessionData;
        const bagItemId = DOMPurify.sanitize(req.body.bagItemId);
        
        try {
            connection = await getConnectionFromPool();
            sessionData = await getSessionDataEntry(connection, req.session.id);
            const bagId = await getBagId(connection, sessionData.accountId);

            if (!bagId) 
                throw new Error('Bag not found');

            if (!validateUuid(bagItemId))
                throw new Error('Invalid bag item');

            const query = 'SELECT * FROM bagItems INNER JOIN products ON bagItems.productId = products.productId WHERE bagItemId = ?;';
            const [results] = await connection.promise().query(query, [bagItemId]);

            if (results.length === 0) 
                throw new Error('Bag item not found');

            if (parseInt(DOMPurify.sanitize(results[0].quantity)) - 1 > 0) {
                newQuantity = parseInt(DOMPurify.sanitize(results[0].quantity)) - 1;
                newTotalPrice = parseFloat(DOMPurify.sanitize(results[0].price)) * newQuantity;
    
                connection.beginTransaction(async(err) => {
                    if (err) throw err;
    
                    try {
                        const query = 'UPDATE bagItems SET quantity = ?, totalPrice = ? WHERE bagItemId = ?;';
                        const values = [newQuantity, newTotalPrice, bagItemId];
    
                        const[results] = await connection.promise().query(query, values);
    
                        const bagDetails = await updateBag(connection, sessionData.accountId);
    
                        connection.commit((err) => {
                            if (err) {
                                return connection.rollback(() => {
                                    throw err;
                                })
                            }
    
                            logger.info('User successfully subtracted quantity of a bag item', {
                                meta: {
                                    event: 'SUBTRACT_QUANTITY_SUCCESS',
                                    method: req.method,
                                    url: req.originalUrl,
                                    accountId: sessionData.accountId,
                                    bagItemId: bagItemId,
                                    sourceIp: req.ip,
                                    userAgent: req.headers['user-agent'],
                                    hostname: req.hostname,
                                    protocol: req.protocol,
                                    port: req.socket.localPort,
                                    geo:geoip.lookup(req.ip)
                                }
                            });
    
                            var updatedBag = {
                                newQuantity: newQuantity,
                                newTotalPrice: newTotalPrice,
                                newSubtotal: bagDetails[0],
                                deliveryFee: bagDetails[1],
                                newTotal: bagDetails[2]
                            }
    
                            res.json({success: true, updatedBag:updatedBag});
                        })
                    } catch (error) {
                        connection.rollback(() => {
                            if (debug)
                                console.error('Error subtracting quantity from bag item: ', error);
                            else 
                                console.error('An error occurred.');
    
                            logger.error('Error when user attempted to subtract quantity from bag item', {
                                meta: {
                                    event: 'SUBCTRACT_QUANTITY_ERROR',
                                    method: req.method,
                                    url: req.originalUrl,
                                    accountId: sessionData.accountId,
                                    bagItemId: bagItemId,
                                    sourceIp: req.ip,
                                    userAgent: req.headers['user-agent'],
                                    hostname: req.hostname,
                                    protocol: req.protocol,
                                    port: req.socket.localPort,
                                    geo:geoip.lookup(req.ip)
                                }
                            })
                            res.json({success:false})
                        })
                    } finally {
                        if (connection)
                            connection.release();
                    }
                })
            } else {
                res.json({success:false})
            }
        } catch(error) {
            if(connection) {
                connection.rollback(() => {
                    if (debug)
                        console.error('Error starting the subtract quantity transaction: ', error);
                    else 
                        console.error('An error occurred.');
    
                    logger.error('Error when starting an subtract quantity transaction', {
                        meta: {
                            event: 'SUBTRACT_QUANTITY_ERROR',
                            method: req.method,
                            url: req.originalUrl,
                            accountId: sessionData.accountId,
                            bagItemId: typeof bagItemId !== 'undefined' ? bagItemId : null,
                            sourceIp: req.ip,
                            userAgent: req.headers['user-agent'],
                            hostname: req.hostname,
                            protocol: req.protocol,
                            port: req.socket.localPort,
                            geo:geoip.lookup(req.ip)
                        }
                    })
                    res.json({success:false})
                })
            } else {
                if (debug)
                    console.error('Error starting the subtract quantity transaction: ', error);
                else 
                    console.error('An error occurred.');

                logger.error('Error when starting an subtract quantity transaction', {
                    meta: {
                        event: 'SUBTRACT_QUANTITY_ERROR',
                        method: req.method,
                        url: req.originalUrl,
                        accountId: sessionData.accountId,
                        bagItemId: typeof bagItemId !== 'undefined' ? bagItemId : null,
                        sourceIp: req.ip,
                        userAgent: req.headers['user-agent'],
                        hostname: req.hostname,
                        protocol: req.protocol,
                        port: req.socket.localPort,
                        geo:geoip.lookup(req.ip)
                    }
                })
                res.json({success:false})
            }
        } finally {
            if (connection)
                connection.release();
        }
    },

    postDeleteBagItem: async (req, res) => {
        let connection;
        let sessionData;
        const bagItemId = DOMPurify.sanitize(req.body.bagItemId);

        try {
            connection = await getConnectionFromPool();
            sessionData = await getSessionDataEntry(connection, req.session.id);
            const bagId = await getBagId(connection, sessionData.accountId);
            
            if (!bagId)
                throw new Error('Bag not found');

            if (!validateUuid(bagItemId))
                throw new Error('Invalid bag item');

            const query = 'SELECT * FROM bagItems WHERE bagItemId = ?;';
            const [results] = await connection.promise().query(query, [bagItemId]);

            if (results.length === 0) 
                throw new Error('Bag item not found');

            connection.beginTransaction(async(err) => {
                if (err) throw err;

                try {
                    const query = 'DELETE FROM bagItems WHERE bagItemId = ?;';

                    const [results] = await connection.promise().query(query, [bagItemId]);

                    const bagDetails = await updateBag(connection, sessionData.accountId);
                    
                    connection.commit((err) => {
                        if (err) {
                            return connection.rollback(() => {
                                throw err;
                            }) 
                        }
                    })

                    logger.info('User successfully deleted a bag item', {
                        meta: {
                            event: 'DELETE_BAG_ITEM_SUCCESS',
                            method: req.method,
                            url: req.originalUrl,
                            accountId: sessionData.accountId,
                            bagItemId: bagItemId,
                            sourceIp: req.ip,
                            userAgent: req.headers['user-agent'],
                            hostname: req.hostname,
                            protocol: req.protocol,
                            port: req.socket.localPort,
                            geo:geoip.lookup(req.ip)
                        }
                    });

                    var newBag = {
                        subtotal: bagDetails[0],
                        deliveryFee: bagDetails[1],
                        total: bagDetails[2]
                    }
                    res.json({success: true, newBag:newBag});
                } catch (error) {
                    connection.rollback(() => {
                        if (debug)
                            console.error('Error deleteing bag item: ', error);
                        else 
                            console.error('An error occurred.');

                        logger.error('Error when user attempted to delete a bag item', {
                            meta: {
                                event: 'DELETE_BAG_ITEM_ERROR',
                                method: req.method,
                                url: req.originalUrl,
                                accountId: sessionData.accountId,
                                bagItemId: bagItemId,
                                sourceIp: req.ip,
                                userAgent: req.headers['user-agent'],
                                hostname: req.hostname,
                                protocol: req.protocol,
                                port: req.socket.localPort,
                                geo:geoip.lookup(req.ip)
                            }
                        })
                        res.json({success:false})
                    })
                } finally {
                    if (connection)
                        connection.release();
                }
            })
        } catch(error) {
            if (connection) {
                connection.rollback(() => {
                if (debug)
                    console.error('Error starting the delete bag item transaction: ', error);
                else 
                    console.error('An error occurred.');

                logger.error('Error when starting a delete bag item transaction', {
                    meta: {
                        event: 'DELETE_BAG_ITEM_ERROR',
                        method: req.method,
                        url: req.originalUrl,
                        accountId: sessionData.accountId,
                        bagItemId: typeof bagItemId !== 'undefined' ? bagItemId : null,
                        sourceIp: req.ip,
                        userAgent: req.headers['user-agent'],
                        hostname: req.hostname,
                        protocol: req.protocol,
                        port: req.socket.localPort,
                        geo:geoip.lookup(req.ip)
                    }
                })
                res.json({success:false})
            })
            }

            else {
                if (debug)
                    console.error('Error starting the delete bag item transaction: ', error);
                else 
                    console.error('An error occurred.');

                logger.error('Error when starting a delete bag item transaction', {
                    meta: {
                        event: 'DELETE_BAG_ITEM_ERROR',
                        method: req.method,
                        url: req.originalUrl,
                        accountId: sessionData.accountId,
                        bagItemId: typeof bagItemId !== 'undefined' ? bagItemId : null,
                        sourceIp: req.ip,
                        userAgent: req.headers['user-agent'],
                        hostname: req.hostname,
                        protocol: req.protocol,
                        port: req.socket.localPort,
                        geo:geoip.lookup(req.ip)
                    }
                })
                res.json({success:false}) 
            }
        } finally {
            if (connection)
                connection.release();
        }
    },
    
    getBagTotal: async (req, res) => {
        let connection;
        let sessionData;

        try {
            connection = await getConnectionFromPool();
            sessionData = await getSessionDataEntry(connection, req.session.id);

            const bagId = await getBagId(connection, sessionData.accountId);

            const query = 'SELECT total FROM bag WHERE bagId = ?;';
            const [results] = await connection.promise().query(query, [bagId])

            if (results.length === 0)
                throw new Error('Bag not found');

            const total = results[0];
            res.json({success: true, total: total});
        } catch(error) {
            if (debug) 
                console.error('Error retrieving bag total price: ', error);
            else
                console.error('An error occurred.');
            
            if (sessionData)
                var accountId = sessionData.accountId;

            logger.error('Error when attempting to retrieve bag total price', {
                meta: {
                    event: 'GET_BAG_TOTAL',
                    method: req.method,
                    url: req.originalUrl,
                    accountId: accountId,
                    errorMessage: error.message, 
                    errorStack: error.stack, 
                    sourceIp: req.ip,
                    userAgent: req.headers['user-agent'],
                    hostname: req.hostname,
                    protocol: req.protocol,
                    port: req.socket.localPort,
                    geo:geoip.lookup(req.ip)
                }
            })
            res.json({ success: false }); 
        } finally {
            if (connection)
                connection.release();
        }
    }
}

module.exports = {bag_controller, getBagId, getBagItems};