const {getConnectionFromPool} = require('../db');
const { getSessionDataEntry } = require('./login_controller');
const { getBagId, getBagItems } = require('./bag_controller');

const { JSDOM } = require('jsdom');
const createDOMPurify = require('dompurify');
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);
const { v4: uuidv4 } = require('uuid');

const fs = require('fs');
const debug = process.env.DEBUG === 'true';
const logger = require('../logger');

const MAX_LENGTH = 50; 

function whiteListValidation(text) { 
    const unicodeCategories = {
        lowercase: /\p{Ll}/u,  // Lowercase letters
        uppercase: /\p{Lu}/u,  // Uppercase letters
        digit: /\p{Nd}/u,      // Decimal digits
        symbol: /\p{Po}/u,     // Other punctuation
        punctuation: /\p{Zs}/u // Space separator 
    };
    
    for (let char of text) {
        let isValid = false;
        for(let category in unicodeCategories) {
            if (unicodeCategories[category].test(char)) {
                isValid = true;
                break;
            }
        }

        if (!isValid) {
            return false;
        }
    }
    return true;
}

async function checkOrderUuidExists(connection, newId) {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT * FROM orders WHERE orderId = ?';
        connection.query(sql, [newId], (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results.length > 0);
            }
        });
    });
}

async function checkOrderItemUuidExists(connection, newId) {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT * FROM orderItems WHERE orderItemId = ?';
        connection.query(sql, [newId], (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results.length > 0);
            }
        });
    });
}

async function getBag(connection, bagId) {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT * FROM bag WHERE bag.bagId = ?;';
        connection.query(sql, [bagId], async (error, results) => {
            if (error) {
                reject(error);
            } else {
                if (results.length === 0) {
                    resolve(null);
                } else {
                    resolve(results[0]);
                }
            }
        })
    })
}

async function removeBagItems(connection, bagId) {
    return new Promise((resolve, reject) => {
        const sql = 'DELETE FROM bagItems WHERE bagId = ?';
        connection.query(sql, [bagId], async (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        })
    })
}

async function addOrder(connection, newOrder, bagId) {
    try {
        let newId;
        let uuidExists = true;

        while(uuidExists) {
            newId = uuidv4();
            uuidExists = await checkOrderUuidExists(connection, newId);
        }
        
        const bag = await getBag(connection, bagId);

        if (!bag)
            throw new Error('Bag not found');

        let currentDate = new Date();
        let datePlus20 = new Date();
        let datePlus30 = new Date();
        datePlus20.setMinutes(datePlus20.getMinutes() + 20);
        datePlus30.setMinutes(datePlus30.getMinutes() + 30);

        newOrder.orderId = newId;
        newOrder.total = parseFloat(DOMPurify.sanitize(bag.total));
        newOrder.subtotal = parseFloat(DOMPurify.sanitize(bag.subtotal));
        newOrder.deliveryFee = parseFloat(DOMPurify.sanitize(bag.deliveryFee));
        newOrder.dateOrdered = currentDate;
        newOrder.ETAMin = datePlus20;
        newOrder.ETAMax = datePlus30;
    
        return new Promise((resolve, reject) => {
            const sql = 'INSERT INTO orders (orderId, accountId, total, subtotal, deliveryFee, dateOrdered, ETAMin, ETAMax, notes, changeFor) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
            const values = [newOrder.orderId, newOrder.accountId, newOrder.total, newOrder.subtotal, newOrder.deliveryFee, newOrder.dateOrdered, newOrder.ETAMin, newOrder.ETAMax, newOrder.notes, newOrder.changeFor];
            connection.query(sql, values, async(error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(newId); // order successfully added 
                }
            })
        }) 
    } catch (error) {
        throw error;
    }
}

async function addOrderItems(connection, orderId, accountId) {
    try {
        const bagItems = await getBagItems(connection, accountId);
        const orderItemIds = []; // To store new order item IDss

        if (!bagItems) 
            throw new Error('Bag items not found')

        for(let bagItem of bagItems) {
            let newId;
            let uuidExists = true;

            while (uuidExists) {
                newId = uuidv4();
                uuidExists = await checkOrderItemUuidExists(connection, newId);
            }

            const orderItem = {
                orderItemId: newId,
                productId: DOMPurify.sanitize(bagItem.productId),
                quantity: parseInt(DOMPurify.sanitize(bagItem.quantity)),
                totalPrice: parseFloat(DOMPurify.sanitize(bagItem.totalPrice)),
                orderId: DOMPurify.sanitize(orderId)
            }

            results = await new Promise((resolve, reject) => {
                const sql = 'INSERT INTO orderItems(orderItemId, productId, quantity, totalPrice, orderId) VALUES (?,?,?,?,?)'
                const values = [orderItem.orderItemId, orderItem.productId, orderItem.quantity, orderItem.totalPrice, orderItem.orderId];
                connection.query(sql, values, async(error, results) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results);
                    }
                })
            })
        }
        return orderItemIds;
    } catch (error) {
        throw error;
    }
}

function validateDetails(newOrder) {    
    // validate note
    newOrder.notes = newOrder.notes.normalize('NFKC');

    if (!(newOrder.notes.length <= MAX_LENGTH))
        return false;

    if (!whiteListValidation(newOrder.notes))
        return false;

    // validate changeFor
    newOrder.changeFor = parseFloat(newOrder.changeFor);

    if (isNaN(newOrder.changeFor))
        return false;

    return true;
}

const checkout_controller = {
    getCheckout: async(req, res) => {
        const data = {
            style: ["bootstrap", "navbar", "checkout"],
            script: ["bootstrap", "checkout"],
            accountDetails: {},
            bag: {}
        }
        
        let connection;
        let sessionData;
        let bagItems;
        try {
            connection = await getConnectionFromPool();
            sessionData = await getSessionDataEntry(connection, req.session.id);
            bagItems = await getBagItems(connection, sessionData.accountId);
            const query = 'SELECT firstName, lastName, phoneNumber, address FROM accounts WHERE accountId = ?;'
            const [accounts] = await connection.promise().query(query, [sessionData.accountId])

            if (!bagItems)
                throw new Error('Bag items not found');

            if (accounts.length === 0)
                throw new Error('Account not found');
            
            data.accountDetails = {
                firstName: DOMPurify.sanitize(accounts[0].firstName), 
                lastName: DOMPurify.sanitize(accounts[0].lastName),
                phoneNumber: DOMPurify.sanitize(accounts[0].phoneNumber),
                address: DOMPurify.sanitize(accounts[0].address)
            }   

            data.bag = {
                bagItems: [],
                subtotal: parseFloat(DOMPurify.sanitize(bagItems[0].subtotal)).toFixed(2),
                deliveryFee: parseFloat(DOMPurify.sanitize(bagItems[0].deliveryFee)).toFixed(2),
                total: parseFloat(DOMPurify.sanitize(bagItems[0].total)).toFixed(2)
            }

            for (var i = 0; i < bagItems.length; i++) {
                var bagItem = {
                    bagItemId: DOMPurify.sanitize(bagItems[i].bagItemId),
                    quantity: parseInt(DOMPurify.sanitize(bagItems[i].quantity)),
                    totalPrice: parseFloat(DOMPurify.sanitize(bagItems[i].totalPrice)).toFixed(2),
                    productName: DOMPurify.sanitize(bagItems[i].name)
                }

                data.bag.bagItems.push(bagItem);
            }

            res.render("checkout", data);
        } catch (error) {
            if (debug) 
                console.error('Error loading checkout page: ', error);
            else 
                console.error('An error occurred')

            logger.error('Error when user attempted to proceed to checkout', {
                meta: {
                    event: 'PROCEED_TO_CHECKOUT',
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
    },

    postCheckout: async(req, res) => {
        let connection;
        let sessionData;
        try {
            connection = await getConnectionFromPool();
            sessionData = await getSessionDataEntry(connection, req.session.id);
            bagId = await getBagId(connection, sessionData.accountId);

            if (!bagId)
                throw new Error('Bag not found');

            const newOrder = {
                orderId: null,
                accountId: sessionData.accountId,
                total: null,
                subtotal: null,
                deliveryFee: null,
                ETAMin: null,
                ETAMax: null,
                notes: req.body.notes,
                changeFor: req.body.changeFor
            }
        
            if (!validateDetails(newOrder)) {
                throw new Error("Invalid order details.");
            }

            //sanitize input 
            newOrder.notes = DOMPurify.sanitize(newOrder.notes);
            newOrder.changeFor = DOMPurify.sanitize(newOrder.changeFor);

            // add order
            connection.beginTransaction(async(err) => {
                if (err) throw err;

                try {
                    const orderId = await addOrder(connection, newOrder, bagId);
            
                    // add orderitems 
                    if (!orderId) {
                        req.flash('error_msg', 'Invalid details.');
                        return res.redirect('/checkout')
                    } else {
                        await addOrderItems(connection, orderId, sessionData.accountId);
                        await removeBagItems(connection, bagId);
                        connection.commit((err) => {
                            if (err) {
                                return connection.rollback(() => {
                                    throw err;
                                });
                            }
                            logger.info('User successfully checked out', {
                                meta: {
                                    event: 'PROCEED_TO_CHECKOUT_SUCCESS',
                                    method: req.method,
                                    url: req.originalUrl,
                                    accountId: sessionData.accountId,
                                    orderId: orderId,
                                    sourceIp: req.ip,
                                    userAgent: req.headers['user-agent']
                                }
                            });
                            return res.redirect('/confirmation/' + orderId);
                        })
                    }
                } catch(error) {
                    connection.rollback(() => {
                        if (debug) 
                            console.error('Error checking out: ', error);
                        else 
                            console.error('An error occurred.');
            
                        logger.error('Error when user attempted to checkout', {
                            meta: {
                                event: 'PROCEED_TO_CHECKOUT_ERROR',
                                method: req.method,
                                url: req.originalUrl,
                                accountId: sessionData.accountId,
                                errorMessage: error.message, 
                                errorStack: error.stack, 
                                sourceIp: req.ip,
                                userAgent: req.headers['user-agent']
                            }
                        });
                        req.flash('error_msg', 'An error occurred upon checking out. Please try again.');
                        return res.redirect('/checkout')
                    })
                } finally {
                    if (connection)
                        connection.release();
                }
            })

        } catch(error) {
            if (debug) 
                console.error('Error starting the checkout transaction: ', error);
            else 
                console.error('An error occurred.');

            logger.error('Error when starting a checkout transaction', {
                meta: {
                    event: 'PROCEED_TO_CHECKOUT_ERROR',
                    method: req.method,
                    url: req.originalUrl,
                    accountId: sessionData.accountId,
                    errorMessage: error.message, 
                    errorStack: error.stack, 
                    sourceIp: req.ip,
                    userAgent: req.headers['user-agent']
                }
            });
            req.flash('error_msg', 'An error occurred upon checking out. Please try again.');
            return res.redirect('/checkout')
        } finally {
            if (connection)
                connection.release();
        }
    } 
}

module.exports = checkout_controller;