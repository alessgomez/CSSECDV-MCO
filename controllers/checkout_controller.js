const {getConnectionFromPool} = require('../db');
const { getSessionDataEntry } = require('./login_controller');
const { getBagId, getBagItems } = require('./bag_controller');

const checkout_controller = {
    getCheckout: async(req, res) => {
        let connection = await getConnectionFromPool();

        try {
            const sessionData = getSessionDataEntry(connection, req.session.id);
            const bagId = await getBagId(connection, req.session.id);
            const bagItems = await getBagItems(connection, req.session.id);

            if (sessionData && bagId && bagItems) {
                connection.query('SELECT firstName, lastName, phoneNumber FROM accounts WHERE accountId = ?', [sessionData.accountId], function(error, results) { // TODO: ADD ADDRESS
                    if (error) {
                        throw error;
                    } else {
                        const account = results;

                        if (account.length === 1) {
                            var accountDetails = {
                                firstName: account[0].firstName, 
                                lastName: account[0].lastName,
                                contactNumber: account[0].phoneNumber,
                                address: "TODO: ADD ADDRESS"
                            }
                            
                            var bag = {
                                bagItems: [],
                                subtotal: parseFloat(bagItems[0].subtotal).toFixed(2),
                                deliveryFee: parseFloat(bagItems[0].deliveryFee).toFixed(2),
                                total: parseFloat(bagItems[0].total).toFixed(2)
                            }

                            for (var i = 0; i < bagItems.length; i++) {
                                var bagItem = {
                                    bagItemId: bagItems[i].bagItemId,
                                    quantity: bagItems[i].quantity,
                                    totalPrice: parseFloat(bagItems[i].totalPrice).toFixed(2),
                                    productName: bagItems[i].name
                                }

                                bag.bagItems.push(bagItem);
                            }

                            const data = {
                                style: ["bootstrap", "navbar", "checkout"],
                                script: ["bootstrap", "checkout"],
                                accountDetails: accountDetails,
                                bag: bag
                            }
    
                            res.render("checkout", data);
                        } else {
                            // TODO: no account found
                        }
                    }
                });
            } else {
                res.redirect('/login');
            }

        } catch (error) {
            console.log("Error loading checkout page");
            console.log(error);
        } finally {
            if (connection)
                connection.release();
        }
    }
}

module.exports = checkout_controller;