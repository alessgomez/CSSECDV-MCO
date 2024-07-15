const { getConnectionFromPool, logPoolStats } = require('../db');

const about_controller = {
    getAbout: async (req, res) => {
        const data = {
            style: ["navbar", "about"]
        }
        res.render('about', data);
    }
}

module.exports = about_controller;