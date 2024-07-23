const { getConnectionFromPool, logPoolStats } = require('../db');;

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
                                dbOrderId: row.dbOrderId,
                                orderSubtotal: parseFloat(row.orderSubtotal).toFixed(2), 
                                deliveryFee: parseFloat(row.deliveryFee).toFixed(2),
                                orderTotal: parseFloat(row.orderTotal).toFixed(2),
                                phoneNumber: row.phoneNumber,
                                address: row.address,
                                notes: row.notes,
                                dateOrdered: row.dateOrdered,
                                orderItems: []
                            };
                            orders.push(order);
                            orderMap.set(row.dbOrderId, order);
                        }
                
                        const orderItem = {
                            productName: row.productName,
                            productPrice: parseFloat(row.productPrice).toFixed(2),
                            quantity: row.quantity,
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