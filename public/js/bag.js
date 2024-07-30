$(document).ready(function(){
    function enableProceed()
    {
        $("#proceed").attr("href", "/checkout");
    } 

    function disableProceed()
    {
        $("#proceed").removeAttr("href");
    }

    function validateUuid(str) {
        let regexUuidv4 = new RegExp(/^[0-9A-Fa-f]{8}(?:\-[0-9A-Fa-f]{4}){3}\-[0-9A-Fa-f]{12}$/);
        return regexUuidv4.test(str);
    }

    $.get("/getItemQuantity", {}, function(result){
    var itemQuantity = parseInt(result[0]);

    if (itemQuantity == 0) 
        disableProceed();

    else 
        enableProceed();
    })

    //plus button
    $(".plus").click(function(){
        var clickedBtn = $(this);
        var bagItemId = $(this).parent().parent().attr("id");

        const isBagItemIdValid = validateUuid(bagItemId);

        if (isBagItemIdValid) {
            $.post("/addQuantity", {bagItemId: bagItemId}, function(result){
                if (result.success) {
                    var newQuantity = result.updatedBag.newQuantity;
                    var newTotalPrice = parseFloat(result.updatedBag.newTotalPrice).toFixed(2);
                    var newSubtotal =  parseFloat(result.updatedBag.newSubtotal).toFixed(2);
                    var newTotal = parseFloat(result.updatedBag.newTotal).toFixed(2);   
                    var deliveryFee = parseFloat(result.updatedBag.deliveryFee).toFixed(2);
                    
                    $(clickedBtn).siblings(".quantity").text(newQuantity);
                    $(clickedBtn).parent().siblings(".price-container").text("₱ " + newTotalPrice);
                    $(clickedBtn).parent().parent().parent().parent().siblings(".payment-container").find(".subtotal").text("₱ " + newSubtotal);
                    $(clickedBtn).parent().parent().parent().parent().siblings(".payment-container").find(".deliveryFee").text("₱ " + deliveryFee);
                    $(clickedBtn).parent().parent().parent().parent().siblings(".payment-container").find(".overallTotal").text("₱ " + newTotal);  
                }        
            })
        } else {
            window.location.assign('/'); 
        }
    
    })

    //minus button
    $(".minus").click(function(){
        var clickedBtn = $(this);
        var bagItemId = $(this).parent().parent().attr("id");

        const isBagItemIdValid = validateUuid(bagItemId);

        if (isBagItemIdValid) {
            $.post("/subtractQuantity", {bagItemId: bagItemId}, function(result){
                if (result.success)
                {
                    var newQuantity = result.updatedBag.newQuantity;
                    var newTotalPrice = parseFloat(result.updatedBag.newTotalPrice).toFixed(2);
                    var newSubtotal =  parseFloat(result.updatedBag.newSubtotal).toFixed(2);
                    var newTotal = parseFloat(result.updatedBag.newTotal).toFixed(2);   
                    var deliveryFee = parseFloat(result.updatedBag.deliveryFee).toFixed(2);
    
                    $(clickedBtn).siblings(".quantity").text(newQuantity);
                    $(clickedBtn).parent().siblings(".price-container").text("₱ " + newTotalPrice);
                    $(clickedBtn).parent().parent().parent().parent().siblings(".payment-container").find(".subtotal").text("₱ " + newSubtotal);
                    $(clickedBtn).parent().parent().parent().parent().siblings(".payment-container").find(".deliveryFee").text("₱ " + deliveryFee);
                    $(clickedBtn).parent().parent().parent().parent().siblings(".payment-container").find(".overallTotal").text("₱ " + newTotal);          
                } 
            })  
        } else {
            window.location.assign('/'); 
        }
    })

    //delete button
    $(".delete").click(function(){
        var bagItemId = $(this).parent().parent().attr("id");
        var orderContainer = $(this).parent().parent();

        const isBagItemIdValid = validateUuid(bagItemId);

        if (isBagItemIdValid) {
            $.post("/deleteBagItem", {bagItemId: bagItemId}, function(result){
                if (result.success) {
                    $(orderContainer).parent().parent().siblings(".payment-container").find(".subtotal").text("₱ " + parseFloat(result.newBag.subtotal).toFixed(2));
                    $(orderContainer).parent().parent().siblings(".payment-container").find(".deliveryFee").text("₱ " + parseFloat(result.newBag.deliveryFee).toFixed(2));
                    $(orderContainer).parent().parent().siblings(".payment-container").find(".overallTotal").text("₱ " + parseFloat(result.newBag.total).toFixed(2)); 
                
                    $(orderContainer).remove();  
        
                    if (result.newBag.total == 0)
                        disableProceed();  
                }      
            });
        } else {
            window.location.assign('/'); 
        }
    })
})