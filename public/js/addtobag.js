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
      count++;
      $("#quantity").text(count);
    
  
      var countChecked =  $(".addOnOption:checked").length;
  
      var checkboxValues = $('.addOnOption:checked').map(function() {
        return $(this).next("label").text();
      }).get();
  
      for (var i = 0; i < countChecked; i++)
      {
        checkboxValues[i] = $.trim(checkboxValues[i]);
      }
  
      var addOnsPrices = [];
  
      var itemQuantity = $("#quantity").text();
      itemQuantity = parseFloat(itemQuantity);
       
      
      var itemPrice = $("#price").text();
      itemPrice = itemPrice.substring(1);
      itemPrice = parseFloat(itemPrice);
  
      if (checkboxValues.length > 0)
      {
          for (var i = 0; i < checkboxValues.length; i++)
          {
            var name = checkboxValues[i];
            $.get('/getAddOn', {name: name}, function(result)  {
              addOnsPrices.push(result.price);
  
              var sum = 0;
              for (var j = 0; j < addOnsPrices.length; j++)
              {
                sum = sum + addOnsPrices[j];
              } 
              var totalPrice = itemQuantity * (itemPrice + sum);
  
              $("#addtobag").text("Add to Bag - ₱" + totalPrice);
  
  
            }); 
          }
      }
      else
      {
        var totalPrice = itemQuantity * itemPrice;
  
        $("#addtobag").text("Add to Bag - ₱" + totalPrice);
      }
  
      var totalPrice = itemQuantity * itemPrice;
  
      $("#addtobag").text("Add to Bag - ₱" + totalPrice);
    });
  
    $("#subtractbtn").click(function(){
      count = parseInt($("#quantity").text());
      if (count > 1)
      {
        count--;
        $("#quantity").text(count);
        
        var countChecked =  $(".addOnOption:checked").length;
  
        var checkboxValues = $('.addOnOption:checked').map(function() {
          return $(this).next("label").text();
        }).get();
  
        for (var i = 0; i < countChecked; i++)
        {
          checkboxValues[i] = $.trim(checkboxValues[i]);
        }
  
        var addOnsPrices = [];
  
        var itemQuantity = $("#quantity").text();
        itemQuantity = parseFloat(itemQuantity);
        
        
        var itemPrice = $("#price").text();
        itemPrice = itemPrice.substring(1);
        itemPrice = parseFloat(itemPrice);
  
        if (checkboxValues.length > 0)
        {
            for (var i = 0; i < checkboxValues.length; i++)
            {
              var name = checkboxValues[i];
              $.get('/getAddOn', {name: name}, function(result)  {
                addOnsPrices.push(result.price);
  
                var sum = 0;
                for (var j = 0; j < addOnsPrices.length; j++)
                {
                  sum = sum + addOnsPrices[j];
                } 
                var totalPrice = itemQuantity * (itemPrice + sum);
  
                $("#addtobag").text("Add to Bag - ₱" + totalPrice);
                
  
              }); 
            }
        }
        else
        {
          var totalPrice = itemQuantity * itemPrice;
  
          $("#addtobag").text("Add to Bag - ₱" + totalPrice);
        }
  
        var totalPrice = itemQuantity * itemPrice;
  
        $("#addtobag").text("Add to Bag - ₱" + totalPrice);
      }
        
    });
  
    $(".addOnOption").change(function()  {
  
      var countChecked =  $(".addOnOption:checked").length;
      
  
      var checkboxValues = $('.addOnOption:checked').map(function() {
        return $(this).next("label").text();
      }).get();
  
      for (var i = 0; i < countChecked; i++)
      {
        checkboxValues[i] = $.trim(checkboxValues[i]);
      }
  
      var addOnsPrices = [];
  
      var itemQuantity = $("#quantity").text();
      itemQuantity = parseFloat(itemQuantity);
       
      
      var itemPrice = $("#price").text();
      itemPrice = itemPrice.substring(1);
      itemPrice = parseFloat(itemPrice);
  
      if (checkboxValues.length > 0)
      {
          for (var i = 0; i < checkboxValues.length; i++)
          {
            var name = checkboxValues[i];
            $.get('/getAddOn', {name: name}, function(result)  {
              addOnsPrices.push(result.price);
  
              var sum = 0;
              for (var j = 0; j < addOnsPrices.length; j++)
              {
                sum = sum + addOnsPrices[j];
              } 
              var totalPrice = itemQuantity * (itemPrice + sum);
  
              $("#addtobag").text("Add to Bag - ₱" + totalPrice);
  
  
            }); 
          }
      }
      else
      {
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

        const isQuantityValid = !isNaN(itemQuantity) && itemQuantity > 0;
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