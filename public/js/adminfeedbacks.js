$(document).ready(function() {
    
    document.querySelectorAll('.deleteBtn').forEach(button => {
        button.addEventListener('click', function() {
            const feedbackId = $(this).data('id');

            $.post('/deleteFeedback', { feedbackId: feedbackId }, function(response){
                if (response.success) 
                    window.location.href = "/viewFeedbacksPage"
            });
            
        });
    });

});