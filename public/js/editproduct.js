$(document).ready(function(){
    $(document).on('click', '#discard-changes', function() {
        window.location.href = `/viewProductsPage`;
    });

    var nameInput = document.getElementById("name");
    var categoryInput = document.getElementById("category")
    var priceInput = document.getElementById("price")
    var fileUploadInput = document.getElementById("inputFile");

    var submit = document.getElementById("save-changes-submit");
    const maxFileSize = 3 * 1024 * 1024; 
    const acceptedTypes = ["image/jpeg", "image/png"]

    var nameValid = true;
    var categoryValid = true;
    var priceValid = true;
    var fileUploadValid = false;
    var fileUploadEmpty = true;

    var nameChanged = false;
    var categoryChanged = false;
    var priceChanged = false;
    var fileChanged = false;

    const productId = $('#save-changes-submit').data('id');

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
        if (nameChanged || categoryChanged || priceChanged || fileChanged) {
            submit.disabled = !(nameValid && categoryValid && priceValid && (fileUploadValid || fileUploadEmpty));
        }
        else {
            submit.disabled = true;
        }
    }

    fileUploadInput.onchange = async function () {
        var file = fileUploadInput.files[0];
        fileUploadValid = false;

        if (file != null) {
            var fileName = file.name;
            fileChanged = true
            fileUploadEmpty = false;
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
                            fileUploadValid = false;
                            validateFields()
                        }
                    
                        image.src = URL.createObjectURL(fileUploadInput.files[0]);                          
                    } else {
                        fileUploadValid = false;
                        validateFields()
                    }
                } else {
                    fileUploadValid = false;
                    validateFields()
                }
            }
        } else {
            fileUploadEmpty = true;
            fileChanged = false;
            validateFields()
        }       
    }

    // name
    let regexName = new RegExp(/^(?!.*[,'-]{2})(?!.* [,'-])(?![,'-])(?=.{1,45}$)[A-Za-z0-9()]+(?:[ ,'-][A-Za-z0-9()]+)*(?:, [A-Za-z()]+)*\.?$/);

    nameInput.onkeyup = function() {

        var name = nameInput.value
        nameValid = name != null && regexName.test(name);

        $.get('/getProduct', { productId: productId }, function(response) {
            if (response.success) {
                if (response.product.name == name) {
                    nameChanged = false;
                } else {
                    nameChanged = true;
                }
                validateFields();
            } else {
              console.error(response.error);
            }
        });
    }

    // category
    categoryInput.onchange = function() {
        var selectedCategory = categoryInput.value;
        categoryValid = validateSelectedCategory(selectedCategory);

        $.get('/getProduct', { productId: productId }, function(response) {
            if (response.success) {
                if (response.product.category == selectedCategory) {
                    categoryChanged = false;
                } else {
                    categoryChanged = true;
                }
                validateFields();
            } else {
              console.error(response.error);
            }
        });

    }

    // price
    priceInput.onkeyup = function() {
        var price = parseFloat(priceInput.value);
        priceValid = !isNaN(price) && price > 0;

        $.get('/getProduct', { productId: productId }, function(response) {
            if (response.success) {
                if (response.product.price == price) {
                    priceChanged = false;
                } else {
                    priceChanged = true;
                }
                validateFields();
            } else {
              console.error(response.error);
            }
        });
    }


});