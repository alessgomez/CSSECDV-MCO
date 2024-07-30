const { getConnectionFromPool } = require('./db');
const { v4: uuidv4 } = require('uuid');
const ids = []

function generateUUIDs() {
    let id = uuidv4()

    while(ids.includes(id)) {
        id = uuidv4();
    }
    ids.push(id);

    return id;
}

function getPcs(qty){
    return " (" + qty + " pcs)";
}

async function populateDb() {
    let connection = await getConnectionFromPool();
    const sql = 'INSERT INTO products (productId, name, category, price, imageFileName) VALUES ?';
    const products = []

    var lasagna = "Premium All Beef Lasagna";
    var ribs = "Smoky Baby Back Ribs";
    var salmon = "Parmesan Baked Salmon";
    var chicken = "Garlic Parmesan Wings";
    var nachoBake = "Four Cheese Nacho Bake";
    var bakedPotato = "Cheesy Bacon Baked Potatoes";
    var truffleFries = "Parmesan Truffle Fries with Dip";
    var twisterFries = "Twister Fries with Dip";
    var cookies = "Reese's Chocochip Cookies";
    var crinkles = "Chocolate Crinkles";
    var cake = "Belgian Chocolate Cake";
    var icedTea = "Houseblend Iced Tea";
    var calamansi = "Calamansi Juice";
    var mango = "Mango Juice";
    var fourSeasons = "Four Seasons Juice";
    var bday = "Birthday Combo";
    var party = "Party Combo";
    var holiday = "Holiday Combo";
    var fiesta = "Fiesta Combo";
    var s = " (Small)";
    var m = " (Medium)";
    var l = " (Large)";
    var main = "main";
    var snack = "snack"
    var dessert = "dessert";
    var drink = "drink";
    var bundle = "bundle";

    // *** MAIN DISHES
    // Lasagna
    products.push([generateUUIDs(), lasagna+s, main, 395, 'lasagna-small.png']);
    products.push([generateUUIDs(), lasagna+m, main, 795, 'lasagna-medium.png']);
    products.push([generateUUIDs(), lasagna+l, main, 1450, 'lasagna-large.png']);
    // Ribs
    products.push([generateUUIDs(), ribs+' (Half Rack)', main, 645, 'ribs-half.png']);
    products.push([generateUUIDs(), ribs+' (Single Rack)', main, 1195, 'ribs-single.png']);
    products.push([generateUUIDs(), ribs+' (Double Rack)', main, 2295, 'ribs-double.png']);
    // Salmon
    products.push([generateUUIDs(), salmon+m, main, 1295, 'salmon-medium.png']);
    products.push([generateUUIDs(), salmon+l, main, 2495, 'salmon-large.png']);
    // Chicken
    products.push([generateUUIDs(), chicken+getPcs(12), main, 450, 'chicken-12.png']);
    products.push([generateUUIDs(), chicken+getPcs(24), main, 880, 'chicken-24.png']);
    
    // *** SNACKS
    // Nacho Bake
    products.push([generateUUIDs(), nachoBake+s, snack, 395, 'nacho-small.png']);
    products.push([generateUUIDs(), nachoBake+m, snack, 790, 'nacho-medium.png']);
    products.push([generateUUIDs(), nachoBake+l, snack, 1150, 'nacho-large.png']);
    products.push([generateUUIDs(), nachoBake+' (Party)', snack, 2295, 'nacho-party.png']);
    // Baked Potato
    products.push([generateUUIDs(), bakedPotato+s, snack, 340, 'potato-small.png']);
    products.push([generateUUIDs(), bakedPotato+m, snack, 680, 'potato-medium.png']);
    products.push([generateUUIDs(), bakedPotato+l, snack, 1295, 'potato-large.png']);
    // Fries 
    products.push([generateUUIDs(), truffleFries, snack, 495, 'truffle.png']);
    products.push([generateUUIDs(), twisterFries, snack, 495, 'twister.png']);
    
    // *** DESSERTS & DRINKS
    // Cookies
    products.push([generateUUIDs(), cookies+getPcs(6), dessert, 250, 'pbutter-6.png']);
    products.push([generateUUIDs(), cookies+getPcs(12), dessert, 480, 'pbutter-12.png']);
    // Crinkles
    products.push([generateUUIDs(), crinkles+getPcs(6), dessert, 250, 'crinkles-10.png']);
    products.push([generateUUIDs(), crinkles+getPcs(12), dessert, 480, 'crinkles-20.png']);
    // Cake
    products.push([generateUUIDs(), cake, dessert, 695, 'cake.png']);
    // Drinks
    products.push([generateUUIDs(), icedTea, drink, 60, 'iced-tea.png']);
    products.push([generateUUIDs(), calamansi, drink, 60, 'calamansi.png']);
    products.push([generateUUIDs(), mango, drink, 60, 'mango.png']);
    products.push([generateUUIDs(), fourSeasons, drink, 60, 'four-seasons.png']);
    
    await new Promise ((resolve, reject) => {
        connection.query(sql, [products], async(error, results) => {
            if (error) {
                reject(error);
            } 
            else {
                resolve(results);
            }
        });
    })
    connection.release();
    console.log('Successfully populated database.');
    process.exit(0);
}

populateDb();