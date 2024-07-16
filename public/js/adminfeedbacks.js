$(document).ready(function() {
    
    document.querySelectorAll('.deleteBtn').forEach(button => {
        button.addEventListener('click', function() {
            const feedbackId = $(this).data('id');
            
            $.post('/deleteFeedback', { feedbackId: feedbackId }, function(response){
                if (response.success) {
                    console.log('Deleted feedback successfully');
                    window.location.href = "/viewfeedbackspage"
                } else{
                    console.error('Failed to delete feedback');
                }
            });
        });
    });

});