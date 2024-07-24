const { getConnectionFromPool, logPoolStats } = require('../db');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);
const config = JSON.parse(fs.readFileSync('config.json'));
const debug = config.DEBUG;

const admin_orders_controller = {
    getViewOrders: async (req, res) => {
        const data = {
            style: ["navbar", "index", "adminproducts"],
            isAdmin: true,
        }

        let connection = await getConnectionFromPool();

        try {
            const query = `SELECT orders.orderId AS dbOrderId, orders.total AS orderTotal, orders.subtotal AS orderSubtotal, 
                        orders.deliveryFee AS deliveryFee, orders.dateOrdered AS dateOrdered, orders.notes AS notes, 
                        orderitems.quantity AS quantity, orderitems.totalPrice AS orderItemTotal,
                        products.name AS productName, products.price AS productPrice, accounts.address AS address, 
                        accounts.phoneNumber AS phoneNumber
                        FROM orders 
                        INNER JOIN orderitems ON orders.orderId = orderitems.orderId 
                        INNER JOIN products ON orderitems.productId = products.productId 
                        INNER JOIN accounts ON orders.accountId = accounts.accountId
                        ORDER BY orders.dateOrdered DESC, orders.orderId`;
            connection.query(query, function(error, results) {
                if (error) {
                    throw error;
                } else {
                    let orders = [];
                    let orderMap = new Map();
                    let autoIncrementedOrderId = 1;

                    results.forEach(row => {
                        if (!orderMap.has(row.dbOrderId)) {
                            const order = {
                                orderId: autoIncrementedOrderId++, // auto-incremented orderId
                                dbOrderId: DOMPurify.sanitize(row.dbOrderId),
                                orderSubtotal: parseFloat(row.orderSubtotal).toFixed(2), 
                                deliveryFee: parseFloat(row.deliveryFee).toFixed(2),
                                orderTotal: parseFloat(row.orderTotal).toFixed(2),
                                phoneNumber: DOMPurify.sanitize(row.phoneNumber),
                                address: DOMPurify.sanitize(row.address),
                                notes: DOMPurify.sanitize(row.notes),
                                dateOrdered: DOMPurify.sanitize(row.dateOrdered),
                                orderItems: []
                            };
                            orders.push(order);
                            orderMap.set(row.dbOrderId, order);
                        }
                
                        const orderItem = {
                            productName: DOMPurify.sanitize(row.productName),
                            productPrice: parseFloat(row.productPrice).toFixed(2),
                            quantity: parseInt(row.quantity),
                            orderItemTotal: parseFloat(row.orderItemTotal).toFixed(2)
                        };
                
                        orderMap.get(row.dbOrderId).orderItems.push(orderItem);
                    });
                
                    data.orders = orders;
                    res.render('adminvieworders', data);
                }
            });
        } catch (error) {
            console.log(error);
        } finally {
            if (connection)
                connection.release();
        }   
    }
}


module.exports = admin_orders_controller;