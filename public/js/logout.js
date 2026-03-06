// public/js/logout.js

// Esse script cuida exclusivamente do botão "Sair do Sistema"

(function () {
  const btnExit = document.querySelector('.btn-exit');

  if (!btnExit) {
    console.warn("Botão 'Sair do Sistema' não encontrado.");
    return;
  }

  btnExit.addEventListener('click', async () => {
    try {
      // Faz logout no back-end (remove cookie JWT httpOnly)
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
    } catch (e) {
      console.error("Erro ao fazer logout:", e);
    }

    // Redireciona sempre para a tela de login
    window.location.href = '/auth';
  });
})();