const { getConnectionFromPool, logPoolStats } = require('../db');

const contact_controller = {
    getContact: async (req, res) => {
        const data = {
            style: ["navbar", "contact"],
            script: ["contact"]
        }
        res.render("contact", data);
    }
}

module.exports = contact_controller;