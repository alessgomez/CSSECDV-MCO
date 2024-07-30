const about_controller = {
    getAbout: async (req, res) => {
        const data = {
            style: ["navbar", "about"],
            bag: req.bag
        }
        res.render('about', data);
    }
}

module.exports = about_controller;