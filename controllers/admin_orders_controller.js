const { getConnectionFromPool, logPoolStats } = require('../db');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const window = new JSDOM('').window;
const fs = require('fs');
const { getSessionDataEntry } = require('./login_controller');
const DOMPurify = createDOMPurify(window);
const debug = process.env.DEBUG === 'true';
const geoip = require('geoip-lite');

const admin_orders_controller = {
    getViewOrders: async (req, res) => {
        const data = {
            style: ["navbar", "index", "adminproducts"],
            isAdmin: true,
        };

        let connection;
        let sessionData;
        try {
            connection = await getConnectionFromPool();
            sessionData = await getSessionDataEntry(connection, req.session.id);

            const query = `
                SELECT 
                orders.orderId AS dbOrderId, 
                orders.total AS orderTotal, 
                orders.subtotal AS orderSubtotal, 
                orders.deliveryFee AS deliveryFee, 
                orders.dateOrdered AS dateOrdered, 
                orders.notes AS notes, 
                orderItems.quantity AS quantity, 
                orderItems.totalPrice AS orderItemTotal,
                products.name AS productName, 
                products.price AS productPrice, 
                accounts.address AS address, 
                accounts.phoneNumber AS phoneNumber
                FROM orders 
                INNER JOIN orderItems ON orders.orderId = orderItems.orderId 
                INNER JOIN products ON orderItems.productId = products.productId 
                INNER JOIN accounts ON orders.accountId = accounts.accountId
                ORDER BY orders.dateOrdered DESC, orders.orderId
            `;

            const [results] = await connection.promise().query(query);

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
        } catch (error) {
            if (debug)
                console.error('Error retrieving orders:', error);
            else 
                console.error('An error occurred.')

            logger.error('Error when admin attempted to view orders', {
                meta: {
                    event: 'VIEW_ORDERS_ERROR',
                    method: req.method,
                    url: req.originalUrl,
                    accountId: sessionData.accountId,
                    productId: productId, 
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

            res.status(500).send('Internal Server Error');
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }
};



module.exports = admin_orders_controller;