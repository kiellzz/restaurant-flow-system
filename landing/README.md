# Landing page

Site estático de apresentação do Restaurant Flow, pronto para publicação no GitHub Pages pelo workflow `.github/workflows/landing-pages.yml`.

## Publicação

1. No repositório do GitHub, abra **Settings > Pages**.
2. Em **Build and deployment > Source**, selecione **GitHub Actions**.
3. Envie os arquivos da landing e do workflow para a branch `main`.
4. Acompanhe a execução **Deploy landing page** na aba **Actions**.

Após o primeiro deploy, o endereço esperado é:

```text
https://kiellzz.github.io/restaurant-flow-system/
```

## Download do Android

O APK local tem mais de 100 MiB e, por isso, está ignorado pelo Git. Para ativar o botão de download permanente:

1. Abra **Releases > Draft a new release** no repositório.
2. Crie uma tag, por exemplo, `v1.0.0`.
3. Anexe `landing/restaurante-system.apk` com esse nome exato.
4. Publique como uma release normal, sem marcar como pre-release.

A landing utiliza o endereço estável abaixo, que sempre aponta para o arquivo da release mais recente:

```text
https://github.com/kiellzz/restaurant-flow-system/releases/latest/download/restaurante-system.apk
```
