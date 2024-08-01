$(document).ready(function(){
    var error_msg = document.getElementById("error");
    function validateUuid(str) {
        let regexUuidv4 = new RegExp(/^[0-9A-Fa-f]{8}(?:\-[0-9A-Fa-f]{4}){3}\-[0-9A-Fa-f]{12}$/);
        return regexUuidv4.test(str);
    }
  
    var itemPrice = $("#price").text();
    itemPrice = itemPrice.substring(1);
    itemPrice = parseFloat(itemPrice);
  
    $("#addtobag").text("Add to Bag - ₱" + itemPrice);
  
    $("#addbtn").click(function(){
      count = parseInt($("#quantity").text());
      if (count < 100) {
        count++;
        $("#quantity").text(count);
  
        var itemQuantity = $("#quantity").text();
        itemQuantity = parseFloat(itemQuantity);
         
        var itemPrice = $("#price").text();
        itemPrice = itemPrice.substring(1);
        itemPrice = parseFloat(itemPrice);
    
        var totalPrice = itemQuantity * itemPrice;
    
        $("#addtobag").text("Add to Bag - ₱" + totalPrice);        
      }      
    });
  
    $("#subtractbtn").click(function(){
      count = parseInt($("#quantity").text());
      if (count > 1)
      {
        count--;
        $("#quantity").text(count);
        
        var itemQuantity = $("#quantity").text();
        itemQuantity = parseFloat(itemQuantity);
        
        
        var itemPrice = $("#price").text();
        itemPrice = itemPrice.substring(1);
        itemPrice = parseFloat(itemPrice);
  
        var totalPrice = itemQuantity * itemPrice;
  
        $("#addtobag").text("Add to Bag - ₱" + totalPrice);
      }
        
    });
  
    $("#addtobag").click(function(){
        var itemQuantity = $("#quantity").text();
        itemQuantity = parseInt(itemQuantity);
        var tPrice = $("#addtobag").text();
        tPrice = tPrice.substring(14);
        tPrice = parseFloat(tPrice);
        var productId = $(this).data('id');

        const isQuantityValid = !isNaN(itemQuantity) && itemQuantity > 0 && itemQuantity <= 100;
        const isTotalPriceValid = !isNaN(tPrice) && tPrice > 0;
        const isProductIdValid = validateUuid(productId);

        if (isQuantityValid && isTotalPriceValid && isProductIdValid) {
            var query = {
                productId: productId,
                quantity: itemQuantity,
                totalPrice: tPrice
            }

            $.post('/addBagItem', query, function(results) {
              if (results.success) {
                error_msg.innerHTML = "";
                error_msg.style.display = "none";
                window.location.assign('/menu'); 
              }
              else
                error_msg.innerHTML = "An error occured.";    
            })
        } else {
          window.location.assign('/menu'); 
        }
    });
  });