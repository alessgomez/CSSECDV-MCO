$(document).ready(function(){
    var nameInput = document.getElementById("name");
    var categoryInput = document.getElementById("category")
    var priceInput = document.getElementById("price")
    var fileUploadInput = document.getElementById("inputFile");

    var submit = document.getElementById("add-product-submit");
    const maxFileSize = 3 * 1024 * 1024; 
    const acceptedTypes = ["image/jpeg", "image/png"]

    var nameValid = false;
    var categoryValid = false
    var priceValid = false;
    var fileUploadValid = false;

    function readFile(file) {
        return new Promise((resolve, reject) => {
            const filereader = new FileReader();
            filereader.onloadend = (event) => {
                if (event.target.readyState === FileReader.DONE) {
                    resolve(event.target.result);
                }
            };
            filereader.onerror = reject;
            const blob = file.slice(0, 12);
            filereader.readAsArrayBuffer(blob);
        })
    }

    function getMimeType(signature) {
        if (signature.startsWith("FFD8FFDB") || signature.startsWith("FFD8FFE0") || signature.startsWith("FFD8FFEE")) {
            return "image/jpeg";
        } 
        else if (signature.startsWith("89504E47")) {
            return "image/png";
        }
        else {
            return "invalid";
        }
    }

    function validateSelectedCategory(selectedCategory) {
        const validOptions = ['main', 'snack', 'drink', 'dessert']
        if (validOptions.includes(selectedCategory)) {
            return true
        } else {
            return false
        }
    }

    function validateFields() {
        submit.disabled = !(nameValid && categoryValid && priceValid && fileUploadValid);
    }

    fileUploadInput.onchange = async function () {
        var file = fileUploadInput.files[0];
        fileUploadValid = false;

        if (file != null) {
            var fileName = file.name;
            let regexFileName = new RegExp(/^[A-Za-z0-9]+([-._ ]*[A-Za-z0-9])*\.(jpg|jpeg|png|JPG|JPEG|PNG)$/);
            
            if (regexFileName.test(fileName) && fileName.length <= 255) {                
                var file = fileUploadInput.files[0];
                let byteStream = await readFile(file); 
                const uint = new Uint8Array(byteStream);
                let bytes = [];
                uint.forEach((byte) => {
                    bytes.push(byte.toString(16));
                });
                const hex = bytes.join("").toUpperCase();
                let mimeType = getMimeType(hex);

                if (acceptedTypes.includes(mimeType)) {
                    var fileSize = fileUploadInput.files[0].size;
                    if (fileSize < maxFileSize) {
                        var image = new Image();

                        image.onload = function() { // Image upload successful
                            fileUploadValid = true;
                            validateFields();
                        }
                        image.onerror = function() {
                            console.log("ERROR: Cannot load image")
                        }

                        image.src = URL.createObjectURL(fileUploadInput.files[0]);                          
                    }
                }
            }
        }
        
        validateFields();
    }

    // name
    let regexName = new RegExp(/^(?!.*[,'-]{2})(?!.* [,'-])(?![,'-])(?=.{1,45}$)[A-Za-z0-9()]+(?:[ ,'-][A-Za-z0-9()]+)*(?:, [A-Za-z()]+)*\.?$/);

    nameInput.onkeyup = function() {
        var name = nameInput.value
        nameValid = name != null && regexName.test(name);
        validateFields();
    }

    // category
    categoryInput.onchange = function() {
        var selectedCategory = categoryInput.value;
        categoryValid = validateSelectedCategory(selectedCategory);
        validateFields();
    }

    // price
    priceInput.onkeyup = function() {
        var price = parseFloat(priceInput.value);
        priceValid = !isNaN(price) && price > 0;
        validateFields();
    }
});