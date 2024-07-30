$(document).ready(function(){
    const toggleButton = document.getElementById("toggle-button");
    const naviList = document.getElementById("right-text-container");
    
    toggleButton.addEventListener("click", ()=>{
        naviList.classList.toggle("active");
    })

    const icon = document.getElementById("bag-icon");
    const  bag = document.getElementById("bag-container");
    
    $("#bag-icon").on("click", ()=>{
        bag.classList.toggle("hide");
    })

    $("#searchbar-input").keyup(function(event){

        if (event.keyCode === 13){
            var q = $("#searchbar-input").val();

            if (q == "")
                window.location.href = "/menu";  

            else
                window.location.href = "/search?q=" + q;
        }
    })
});