const {getConnectionFromPool} = require('../db');
const { getSessionDataEntry } = require('./login_controller');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

const fs = require('fs');
const debug = process.env.DEBUG;
const logger = require('../logger');

function validateUuid(str) {
    let regexUuidv4 = new RegExp(/^[0-9A-Fa-f]{8}(?:\-[0-9A-Fa-f]{4}){3}\-[0-9A-Fa-f]{12}$/);
    return regexUuidv4.test(str);
}

const confirmation_controller = {
    getConfirmation: async(req, res) => {
        const data = {
            style: ["bootstrap", "navbar", "confirmation"],
            script: ["bootstrap", "confirmation"],
            order: {},
            orderItems: [],
            bag: req.bag
        }

        let connection;
        let sessionData;
        const orderId = DOMPurify.sanitize(req.params.id);

        try {
            connection = await getConnectionFromPool();
            sessionData = await getSessionDataEntry(connection, req.session.id);
            
            if (!validateUuid(orderId))
                throw new Error('Invalid order');

            let query = `
                SELECT 
                orders.ETAMin,
                orders.ETAMax,
                orders.subtotal,
                orders.deliveryFee, 
                orders.total,
                orders.orderId,
                orders.changeFor,
                orders.notes,
                accounts.phoneNumber,
                accounts.address
                FROM orders 
                INNER JOIN accounts ON orders.accountId = accounts.accountId
                WHERE orders.orderId = ?
            `;

            const [orders] = await connection.promise().query(query, [orderId]);
            
            if (orders.length === 0)
                throw new Error('Order not found');
            
      
            let options = {
                hour: 'numeric',
                minute: 'numeric',
                hour12: true,
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            };

            const result = orders[0];

            data.order = {
                ETAMin: DOMPurify.sanitize(result.ETAMin),
                ETAMax: DOMPurify.sanitize(result.ETAMax),
                subtotal: parseFloat(DOMPurify.sanitize(result.subtotal)).toFixed(2),
                deliveryFee: parseFloat(DOMPurify.sanitize(result.deliveryFee)).toFixed(2),
                total: parseFloat(DOMPurify.sanitize(result.total)).toFixed(2),
                orderId: orderId, 
                changeFor: parseFloat(DOMPurify.sanitize(result.changeFor)).toFixed(2),
                phoneNumber: DOMPurify.sanitize(result.phoneNumber),
                address: DOMPurify.sanitize(result.address),
                notes: DOMPurify.sanitize(result.notes)
            }
            
            // Format the time
            let timeOptions = {
                hour: 'numeric',
                minute: 'numeric',
                hour12: true
            };
            let timeFormatter = new Intl.DateTimeFormat('en-US', timeOptions);

            // Format the date
            let dateOptions = {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            };
            let dateFormatter = new Intl.DateTimeFormat('en-US', dateOptions);

            ETAMin = new Date(data.order.ETAMin);
            ETAMax = new Date(data.order.ETAMax);

            let ETAMin_time = timeFormatter.format(ETAMin);
            let ETAMin_date = dateFormatter.format(ETAMin);
            data.order.ETAMin = `${ETAMin_time} ${ETAMin_date}`;

            let ETAMax_time = timeFormatter.format(ETAMax);
            let ETAMax_date = dateFormatter.format(ETAMax);
            data.order.ETAMax = `${ETAMax_time} ${ETAMax_date}`;

            query = `
                SELECT 
                orderItems.quantity,
                products.name,
                orderItems.totalPrice
                FROM orderItems  
                INNER JOIN products ON orderItems.productId = products.productId
                WHERE orderItems.orderId = ?
            `;
        
            const [orderItems] = await connection.promise().query(query, [req.params.id]);
            
            if (orderItems.length === 0) 
                throw new Error('Order items not found');

            data.orderItems = orderItems.map(orderItem => ({
                quantity: parseInt(DOMPurify.sanitize(orderItem.quantity)),
                name: DOMPurify.sanitize(orderItem.name),
                totalPrice: parseFloat(DOMPurify.sanitize(orderItem.totalPrice)).toFixed(2)
            }))

            res.render('confirmation', data);
        } catch(error) {
            if (debug)
                console.error('Error loading order confirmation page: ', error);
            else
                console.error('An error occurred')
            logger.error('Error when user attempted to load order confirmation page', {
                meta: {
                    event: 'VIEW_CONFIRMATION',
                    method: req.method,
                    url: req.originalUrl,
                    accountId: sessionData.accountId,
                    orderId: orderId,
                    error: error,
                    sourceIp: req.ip,
                    userAgent: req.headers['user-agent']
                }
            });
            req.flash('error_msg', 'An error occurred. Please try again later.');
            res.redirect('/');
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }
}

module.exports =  confirmation_controller;