# Essenza — modelo de clínica
Python 3.10+. No terminal, dentro da pasta:

    python -m venv .venv
    .venv\Scripts\activate
    pip install -r requirements.txt
    python app.py

No Linux/macOS, use `source .venv/bin/activate` em vez do comando de ativação Windows.
Abra http://127.0.0.1:5000. O banco consultas.db é criado automaticamente. Use dados fictícios. Os horários são preferências, não disponibilidade real. Antes de publicar: implementar autenticação administrativa, proteção contra abuso, HTTPS, política LGPD, retenção e exclusão de dados, agenda real e revisão profissional. Fontes Google são opcionais e carregadas pela internet.
