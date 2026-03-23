// mechanic-init.js

// Function to show mechanic-only menu items
function showMechanicMenu() {
    const menuItems = document.querySelectorAll('.menu-item'); // Assuming menu items have this class
    menuItems.forEach(item => {
        if (item.classList.contains('mechanic-only')) { // Check for mechanic-only class
            item.style.display = 'block'; // Show mechanic-only items
        } else {
            item.style.display = 'none'; // Hide other items
        }
    });
}

// Initialize mechanic-specific functionality
function initMechanicFunctionality() {
    showMechanicMenu(); // Show mechanic menu items
    // Add other mechanic-specific initializations here
}

// Call the initialization function on document load
document.addEventListener('DOMContentLoaded', initMechanicFunctionality);