const { connect } = require('http2');
const {getConnectionFromPool} = require('../db.js');
const { getSessionDataEntry } = require('./login_controller');
const fs = require('fs');
const { JSDOM } = require('jsdom');
const session = require('express-session');
const window = new JSDOM('').window;
const debug = process.env.DEBUG;

function getOrderId (connection, accountId, index){
    return new Promise((resolve, reject) => {
        connection.query("SELECT orderId FROM orders WHERE accountId = ? ORDER BY dateOrdered ASC;", accountId, function (error, results) {
            if (error) {
                throw error;
            } else {
                if (results.length > 0){
                    let orderId = results[index].orderId;
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
            orders: [],
            partialName: [],
            bag: req.bag
        }
        let connection = await getConnectionFromPool();
        let sessionData = await getSessionDataEntry(connection, req.session.id);

        try {
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

                    orderHistoryPageData.orders = results.map(order => {
                        return{
                            orderId: order.orderId
                        };
                    });                    

                    res.render('orderhistory', orderHistoryPageData);
                }
            });
        } catch(error){
            console.log(error);
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

                    orderDetailsPageData.orders = results.map(order => {
                        return{
                            orderId: order.orderId
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

                    orderDetailsPageData.date = results[0].date;

                    orderDetailsPageData.currOrder.completeAddress = results[0].completeAddress;

                    orderDetailsPageData.currOrder.subtotal = results[0].subtotal;

                    orderDetailsPageData.currOrder.deliveryFee = results[0].deliveryFee;

                    orderDetailsPageData.currOrder.total = results[0].total;

                    orderDetailsPageData.particulars = results.map(particular => {
                        return{
                            quantity: particular.quantity,
                            name: particular.name,
                            price: particular.price
                        };
                    });    

                    res.render('orderhistory', orderDetailsPageData);
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


module.exports = order_history_controller;