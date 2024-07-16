$(document).ready(function() {
    $(document).on('click', '.archiveBtn', function() {
        const productId = $(this).data('id');
        const $productRow = $(this).closest('tr');
        
        $.post('/archiveProduct', { productId: productId }, function(response) {
            if (response.success) {
                $productRow.addClass('archived');
                $productRow.find('.archiveBtn').removeClass('archiveBtn').addClass('unarchiveBtn').text('Unarchive');
                $productRow.find('.productInfo').removeClass('bestseller');
                $productRow.find('.removeBestsellerBtn').removeClass('removeBestsellerBtn').addClass('addBestsellerBtn').text('Add to Bestsellers');
                $productRow.find('.editBtn, .addBestsellerBtn').prop('disabled', true); // Disable edit and add to bestseller buttons
            } else {
              console.error('Failed to archive product');
            }
        });
    });

    $(document).on('click', '.unarchiveBtn', function() {
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
    
    $(document).on('click', '.addBestsellerBtn', function() {
        const productId = $(this).data('id');
        const $productRow = $(this).closest('tr');
        
        $.post('/addBestseller', { productId: productId }, function(response) {
            if (response.success) {
                $productRow.find('.productInfo').addClass('bestseller');
                $productRow.find('.addBestsellerBtn').removeClass('addBestsellerBtn').addClass('removeBestsellerBtn').text('Remove from Bestsellers');
            } else {
              console.error('Failed to add product to bestsellers');
            }
          });
    });

    $(document).on('click', '.removeBestsellerBtn', function() {
        const productId = $(this).data('id');
        const $productRow = $(this).closest('tr');
        
        $.post('/removeBestseller', { productId: productId }, function(response) {
            if (response.success) {
                $productRow.find('.productInfo').removeClass('bestseller');
                $productRow.find('.removeBestsellerBtn').removeClass('removeBestsellerBtn').addClass('addBestsellerBtn').text('Add to Bestsellers');
            } else {
              console.error('Failed to remove product from bestsellers');
            }
          });
    });

    $(document).on('click', '.editBtn', function() {
      const productId = $(this).data('id');
      window.location.href = `/editProductPage/${productId}`;;
    });
});
