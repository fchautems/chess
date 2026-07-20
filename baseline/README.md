# Baseline V7.1

Source immuable de la migration. Le fichier original est stocké sous forme gzip encodée en Base64 pour garantir une copie exacte et faciliter le transport via l’API GitHub.

Restauration :

```bash
base64 -d entraineur_ouvertures_echecs_v7_1.html.gz.b64 | gzip -d > entraineur_ouvertures_echecs_v7_1.html
sha256sum -c SHA256.txt
```

Aucune modification fonctionnelle ne doit être faite dans ce dossier.
