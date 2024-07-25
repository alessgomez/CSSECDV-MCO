const { getConnectionFromPool, logPoolStats } = require('../db');
const { getSessionDataEntry } = require('./login_controller');
const { v4: uuidv4 } = require('uuid');

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

async function getBagId(connection, sessionId) {
    try {
        console.log("HI 1");
        const sessionData = await getSessionDataEntry(connection, sessionId);
        console.log("HI 4");
        if (sessionData) {
            console.log("HI 5");
            return new Promise((resolve, reject) => {
                console.log("HI 6");
                const sql = 'SELECT * FROM bag WHERE accountId = ?';
                console.log("HI 7");
                connection.query(sql, [sessionData.accountId], async(error, results) => {
                    console.log("HI 8");
                    if (error) {
                        reject(error);
                    } else {
                        console.log("HI 9");
                        if (results.length === 0) {
                            resolve(null);
                        } else {
                            console.log("HI 10");
                            const bag = results[0];
                            resolve(bag.bagId);
                        }
                    }
                })
            })
        } else {
            // TODO: HANDLE ERROR
        }
    } catch (error) {
        console.log(error);
    }
}

async function getBagItems(connection, sessionId) {
    try {
        var bagId = await getBagId(connection, sessionId);

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
        console.log(error);
    }
}

async function updateBag(connection, sessionId) {
    try {
        var bagId = await getBagId(connection, sessionId);
        var bagItems = await getBagItems(connection, sessionId);

        console.log("NAKO NAKO NAKO");
        console.log(bagItems);
        
        return new Promise((resolve, reject) => {
            var subtotal = 0;
            var deliveryFee = 0;
            var total = 0;

            if (bagItems.length > 0) {
                deliveryFee = 50;
                for (var i = 0; i < bagItems.length; i++) {
                    subtotal += bagItems[i].totalPrice;
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
        console.log(error);
    }
}

const bag_controller = {
    getBag: async (req, res, next) => {
        let connection = await getConnectionFromPool();

        try {
            var bagItems = await getBagItems(connection, req.session.id);
            bag = {
                bagItems: [],
                subtotal: parseFloat(0).toFixed(2),
                deliveryFee: parseFloat(0).toFixed(2),
                total: parseFloat(0).toFixed(2)
            }                    
            if (bagItems.length > 0) {
                bag.subtotal = parseFloat(bagItems[0].subtotal).toFixed(2);
                bag.deliveryFee = parseFloat(bagItems[0].deliveryFee).toFixed(2);
                bag.total = parseFloat(bagItems[0].total).toFixed(2);

                for (var i = 0; i < bagItems.length; i++) {
                    var bagItem = {
                        bagItemId: bagItems[i].bagItemId,
                        quantity: bagItems[i].quantity,
                        totalPrice: parseFloat(bagItems[i].totalPrice).toFixed(2),
                        product: {
                            productId: bagItems[i].productId,
                            name: bagItems[i].name
                        }
                    }
                    bag.bagItems.push(bagItem);
                }
            }
            req.bag = bag;
            return next();
        } catch(error) {
            console.error(error);
        } finally {
            if (connection)
                connection.release();
        }
    },

    postAddBagItem: async (req,res) => {
        let connection = await getConnectionFromPool();

        try {
            var bagItem = {
                productId: req.body.productId,
                quantity: req.body.quantity,
                totalPrice: req.body.totalPrice,
                bagId: await getBagId(connection, req.session.id)
            }
            
            let newId;
            let uuidExists = true;

            while(uuidExists) {
                newId = uuidv4();
                uuidExists = await checkUuidExists(connection, newId, 'bagItemId');
            }

            const sql = 'INSERT INTO bagItems (bagItemId, productId, quantity, totalPrice, bagId) VALUES (?,?,?,?,?)';
            const values = [newId, bagItem.productId, bagItem.quantity, bagItem.totalPrice, bagItem.bagId]
            
            connection.query(sql, values, async(error, results) => {
                if (error) {
                    throw error;
                } else {
                    await updateBag(connection, req.session.id);
                    res.send(results);
                }
            })
        } catch(error) {
            console.error(error);
        } finally {
            if (connection)
                connection.release();
        }
    },

    getItemQuantity: async (req, res) => {
        let connection = await getConnectionFromPool();

        try {
            var bagId = await getBagId(connection, req.session.id);
            const sql = 'SELECT * FROM bag INNER JOIN bagItems ON bag.bagId = bagItems.bagId WHERE bag.bagId = ?;';
            connection.query(sql, [bagId], async(error, results) => {
                if (error) {
                    reject(error);
                } else {
                    res.send([results.length]);
                }
            })

        } catch(error) {
            console.error(error);
        } finally {
            if (connection)
                connection.release();
        }
    },

    postAddQuantity: async (req, res) => {
        let connection = await getConnectionFromPool();
        try {
            var bagId = await getBagId(connection, req.session.id);
            const sql = 'SELECT * FROM bagItems INNER JOIN products ON bagItems.productId = products.productId WHERE bagItemId = ?;';
            connection.query(sql, [req.body.bagItemId], async(error, results) => {
                if (error) {
                    reject(error);
                } else {
                    newQuantity = results[0].quantity + 1;
                    newTotalPrice = results[0].price * newQuantity;

                    const sql = 'UPDATE bagItems SET quantity = ?, totalPrice = ? WHERE bagItemId = ?;';
                    const values = [newQuantity, newTotalPrice, req.body.bagItemId];

                    connection.query(sql, values, async (error, results) => {
                        if (error) {
                            throw error;
                        } else {
                            const bagDetails = await updateBag(connection, req.session.id);

                            var updatedBag = {
                                newQuantity: newQuantity,
                                newTotalPrice: newTotalPrice,
                                newSubtotal: bagDetails[0],
                                deliveryFee: bagDetails[1],
                                newTotal: bagDetails[2]
                            }

                            res.send(updatedBag);
                        }
                    })
                }
            })

        } catch(error) {
            console.error(error);
        } finally {
            if (connection)
                connection.release();
        }
    },

    postSubtractQuantity: async (req, res) => {
        let connection = await getConnectionFromPool();
        try {
            var bagId = await getBagId(connection, req.session.id);
            const sql = 'SELECT * FROM bagItems INNER JOIN products ON bagItems.productId = products.productId WHERE bagItemId = ?;';
            connection.query(sql, [req.body.bagItemId], async(error, results) => {
                if (error) {
                    reject(error);
                } else {
                    if (results[0].quantity - 1 > 0) {
                        newQuantity = results[0].quantity - 1;
                        newTotalPrice = results[0].price * newQuantity;
    
                        const sql = 'UPDATE bagItems SET quantity = ?, totalPrice = ? WHERE bagItemId = ?;';
                        const values = [newQuantity, newTotalPrice, req.body.bagItemId];
    
                        connection.query(sql, values, async (error, results) => {
                            if (error) {
                                throw error;
                            } else {
                                const bagDetails = await updateBag(connection, req.session.id);
    
                                var newBag = {
                                    newQuantity: newQuantity,
                                    newTotalPrice: newTotalPrice,
                                    newSubtotal: bagDetails[0],
                                    deliveryFee: bagDetails[1],
                                    newTotal: bagDetails[2]
                                }
    
                                res.send(newBag);
                            }
                        })
                    } else { //subtracting results in 0 or less quantity 
                        res.send(false);                    
                    }
                }
            })

        } catch(error) {
            console.error(error);
        } finally {
            if (connection)
                connection.release();
        }
    },

    postDeleteBagItem: async (req, res) => {
        let connection = await getConnectionFromPool();

        try {
            var bagId = await getBagId(connection, req.session.id);
            const sql = 'SELECT * FROM bagItems WHERE bagItemId = ?;';
            connection.query(sql, [req.body.bagItemId], async(error, results) => {
                if (error) {
                    reject(error);
                } else {
                    if (results.length === 1) { // if bagitem is found 
                        const sql = 'DELETE FROM bagItems WHERE bagItemId = ?;';
                        connection.query(sql, [req.body.bagItemId], async(error, results) => {
                            if (error) {
                                throw error;
                            } else {
                                const bagDetails = await updateBag(connection, req.session.id);
    
                                var newBag = {
                                    subtotal: bagDetails[0],
                                    deliveryFee: bagDetails[1],
                                    total: bagDetails[2]
                                }
    
                                res.send(newBag);
                            }
                        })
                    }
                }
            })
        } catch(error) {
            console.log(error);
        } finally {
            if (connection)
                connection.release();
        }
    }
}

module.exports = {bag_controller, getBagId, getBagItems};