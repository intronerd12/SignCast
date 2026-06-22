const API_BASE = 'http://localhost:5000/api/v1';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registerForm');
  const submitBtn = document.getElementById('submitBtn');
  const statusMessage = document.getElementById('statusMessage');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    statusMessage.textContent = '';

    const formData = new FormData(form);
    const name = formData.get('name');
    const email = formData.get('email');
    const phone = formData.get('phone');
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');

    if (password !== confirmPassword) {
      statusMessage.style.color = '#d32f2f';
      statusMessage.textContent = 'Passwords do not match.';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';

    try {
      const response = await fetch(`${API_BASE}/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          password,
          isAdmin: false,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Unable to create account.');
      }

      statusMessage.style.color = 'var(--teal-deep)';
      statusMessage.textContent = 'Registration successful. You can now login to SignCast.';
      form.reset();

      // Redirect to login after successful registration
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);
    } catch (error) {
      statusMessage.style.color = '#d32f2f';
      statusMessage.textContent = error.message;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create account';
    }
  });
});
