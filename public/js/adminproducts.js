$(document).ready(function() {
    $(document).on('click', '.archiveBtn', function() {
        const productId = $(this).data('id');
        const $productRow = $(this).closest('tr');
        
        $.post('/archiveProduct', { productId: productId }, function(response) {
            console.log("archive button clicked")
            if (response.success) {
                $productRow.addClass('archived');
                $productRow.find('.archiveBtn').removeClass('archiveBtn').addClass('unarchiveBtn').text('Unarchive');
                $productRow.find('.editBtn, .addBestsellerBtn').prop('disabled', true); // Disable edit and add to bestseller buttons
            } else {
              console.error('Failed to archive product');
            }
          });
    });

    $(document).on('click', '.unarchiveBtn', function() {
        console.log("unarchive button clicked")

        const productId = $(this).data('id');
        const $productRow = $(this).closest('tr');

        $.post('/unarchiveProduct', { productId: productId }, function(response) {
            if (response.success) {
                $productRow.removeClass('archived');
                $productRow.find('.unarchiveBtn').removeClass('unarchiveBtn').addClass('archiveBtn').text('Archive');
                $productRow.find('.editBtn, .addBestsellerBtn').prop('disabled', false); // Enable edit and add to bestseller buttons
            } else {
              console.error('Failed to unarchive product');
            }
          });
    });

});
