const { getConnectionFromPool, logPoolStats } = require('../db');
const { fileFilter, getMimeType, sanitizeImage } = require('./registration_controller.js')
const fs = require('fs');
const sharp = require('sharp');
const multer = require('multer');
const { v4: uuidv4, validate } = require('uuid');
const storage = multer.memoryStorage();
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);
const config = JSON.parse(fs.readFileSync('config.json'));
const debug = config.DEBUG;
const logger = require('../logger');
const { getSessionDataEntry } = require('./login_controller.js');
const geoip = require('geoip-lite');

function getOrderId (connection, accountId, index){
    return new Promise((resolve, reject) => {
        connection.query("SELECT orderId FROM orders WHERE accountId = ? ORDER BY dateOrdered ASC;", accountId, function (error, results) {
            if (error) {
                throw error;
            } else {
                if (results.length > 0){
                    let orderId = DOMPurify.sanitize(results[index].orderId);
                    resolve(orderId);
                }
            }
        });
    });
    
}

const order_history_controller = { 

    getOrderHistory: async (req, res) => {
        const orderHistoryPageData = {
            style: ["navbar", "index", "orderhistory"],
            partialName: [],
            bag: req.bag
        }
        let connection;
        let sessionData;

        try {

            connection = await getConnectionFromPool();
            sessionData = await getSessionDataEntry(connection, req.session.id);

            const sql = "SELECT orderId FROM orders WHERE accountId = ? ORDER BY dateOrdered ASC"
            const values = [sessionData.accountId];
            connection.query(sql, values, async (error, results) => {
                if(error) {
                    throw error;
                } else {
                    if (results.length > 0){
                        orderHistoryPageData.partialName = "withorders"  ;
                    }else {
                        orderHistoryPageData.partialName = "withoutorders";
                    }

                    orderHistoryPageData.orders = results.map((order, index) => {
                        return{
                            ...order,
                            incrementedIndex: parseInt(index + 1)
                        }
                    })

                    res.render('orderhistory', orderHistoryPageData);
                }
            });
        } catch(error){
            if (debug)
                console.error('Error viewing page: ', error)
            else
                console.error('An error occurred')

            logger.error('Error when viewing the page', {
                meta: {
                    event: 'VIEW_ORDERS_PAGE_ERROR',
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

        } finally {
            if (connection)
                connection.release();
        }
    },

     getOrderDetails: async (req, res) => {

        const orderDetailsPageData = {
            style: ["navbar", "index", "orderhistory"],
            partialName: ["withorders"],
            orders: [],
            currOrder: [],
            date: [],
            particulars: [],
            bag: req.bag
        }

        let connection = await getConnectionFromPool();
        let sessionData = await getSessionDataEntry(connection, req.session.id);

        try {
            connection.query("SELECT orderId FROM orders WHERE accountId = ? ORDER BY dateOrdered ASC;", [sessionData.accountId], async (error, results) => {
                if (error) {
                    throw error;
                } else {

                    orderDetailsPageData.orders = results.map((order, index) => {
                        return{
                            ...order,
                            incrementedIndex: parseInt(index + 1)
                        };
                    });      
                }
            });
 
            orderDetailsPageData.currOrder.orderId = await getOrderId(connection, sessionData.accountId, req.params.index);

            //Get Order Details

            const sql = `SELECT o.orderId AS orderId, o.ETAMAX AS date, a.address AS completeAddress, oi.quantity AS quantity, oi.totalPrice AS price, p.name AS name, o.subtotal AS subtotal, o.deliveryFee AS deliveryFee, o.total AS total
                        FROM orders o 
                        JOIN accounts a ON o.accountId = a.accountId 
                        JOIN orderitems oi ON o.orderId = oi.orderId
                        JOIN products p ON oi.productId = p.productId
                        WHERE o.orderId = ? AND a.accountId = ?;`
            const values = [orderDetailsPageData.currOrder.orderId, sessionData.accountId];

            connection.query(sql, values, async (error, results) => {
                if(error) {
                    throw error;
                } else {

                    orderDetailsPageData.date = DOMPurify.sanitize(results[0].date);

                    orderDetailsPageData.currOrder.completeAddress = DOMPurify.sanitize(results[0].completeAddress);

                    orderDetailsPageData.currOrder.subtotal = parseFloat(results[0].subtotal);

                    orderDetailsPageData.currOrder.deliveryFee = parseFloat(results[0].deliveryFee);

                    orderDetailsPageData.currOrder.total = results[0].total;

                    orderDetailsPageData.particulars = results.map(particular => {
                        return{
                            quantity: parseInt(particular.quantity),
                            name: DOMPurify.sanitize(particular.name),
                            price: parseFloat(particular.price)
                        };
                    });    

                    res.render('orderhistory', orderDetailsPageData);
                }
            });
        } catch(error){
            if (debug)
                console.error('Error loading order: ', error)
            else
                console.error('An error occurred')

            logger.error('Error when viewing the page with specific order', {
                meta: {
                    event: 'VIEW_ORDERS_PAGE_ERROR',
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
        } finally {
            if (connection)
                connection.release();
        }
     }



}


module.exports = order_history_controller;