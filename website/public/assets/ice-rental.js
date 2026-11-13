(() => {
  const worksheet = document.querySelector('.ice-worksheet');
  if (!worksheet) return;
  const answers = [...worksheet.querySelectorAll('textarea')];
  const status = document.getElementById('ice-progress');
  worksheet.addEventListener('input', () => {
    const count = answers.filter(field => field.value.trim()).length;
    status.textContent = `${count} of 20 answers entered. ${count === 20 ? 'Review each answer with the operator before you book.' : 'Empty answers need a follow-up.'}`;
    answers.forEach(field => { field.textContent = field.value; });
  });
  document.getElementById('ice-print').addEventListener('click', () => window.print());
})();
