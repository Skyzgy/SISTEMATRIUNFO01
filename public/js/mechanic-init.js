document.addEventListener('DOMContentLoaded', function() {
    // Assuming 'user' is an object available after login
    if (user.role === 'mechanic') {
        // Hide elements with specified classes
        const adminOnlyElements = document.querySelectorAll('.admin-only');
        const osOnlyElements = document.querySelectorAll('.os-only');
        const abastOnlyElements = document.querySelectorAll('.abast-only');

        adminOnlyElements.forEach(el => el.style.display = 'none');
        osOnlyElements.forEach(el => el.style.display = 'none');
        abastOnlyElements.forEach(el => el.style.display = 'none');

        // Show only the specified elements
        const reqModal = document.querySelector('[data-open-modal="req"]');
        const minhasReqNav = document.querySelector('[data-nav-target="minhas-req"]');

        reqModal.style.display = 'block';
        minhasReqNav.style.display = 'block';

        // Navigate to 'minhas-req' screen
        window.location.href = '#minhas-req';
    }
});
