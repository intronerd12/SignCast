const API_BASE = 'http://localhost:5000/api/v1';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const submitBtn = document.getElementById('submitBtn');
  const statusMessage = document.getElementById('statusMessage');
  const userLabel = document.getElementById('userLabel');
  const adminLabel = document.getElementById('adminLabel');
  
  // Handle segment control
  const radios = document.querySelectorAll('input[name="accessType"]');
  radios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.value === 'user') {
        userLabel.classList.add('selected');
        adminLabel.classList.remove('selected');
      } else {
        adminLabel.classList.add('selected');
        userLabel.classList.remove('selected');
      }
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    statusMessage.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';

    const formData = new FormData(form);
    const email = formData.get('email');
    const password = formData.get('password');
    const accessType = formData.get('accessType');

    try {
      const response = await fetch(`${API_BASE}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Unable to login. Please check your account.');
      }

      if (accessType === 'admin' && !data.isAdmin) {
        throw new Error('This account is not assigned as an admin account.');
      }

      localStorage.setItem('signcastAuth', JSON.stringify(data));
      statusMessage.style.color = 'var(--teal-deep)';
      statusMessage.textContent = data.isAdmin 
        ? 'Admin login successful. Admin dashboard can be connected next.' 
        : 'Login successful. SignCast app access can be connected next.';
      
      // Redirect or perform action after successful login
      setTimeout(() => {
        window.location.href = 'index.html'; // Or appropriate dashboard
      }, 1500);
    } catch (error) {
      statusMessage.style.color = '#d32f2f';
      statusMessage.textContent = error.message;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign in';
    }
  });
});
