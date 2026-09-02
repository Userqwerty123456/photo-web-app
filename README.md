# 📸 Photo Web App

Простое веб-приложение на FastAPI для фотографирования с камеры телефона/ПК и хранения фотографий.

## Стек

- FastAPI
- Python 3.11
- HTML / CSS / JavaScript
- Docker
- Docker Compose

## Запуск через Docker Desktop

Открой PowerShell в папке проекта:

```powershell
docker compose up --build -d
```

После запуска открой:

```text
http://localhost:8000
```

Проверка API:

```text
http://localhost:8000/api/health
```

## Остановка

```powershell
docker compose down
```

## Где хранятся фотографии

Фотографии сохраняются на компьютере в:

```text
data/photos/
```

Docker volume связывает эту папку с:

```text
/app/data/photos
```

Поэтому фотографии не пропадут после перезапуска контейнера.

## Телефон

Если телефон и компьютер находятся в одной Wi-Fi сети, нужно открыть приложение по IP-адресу компьютера:

```text
http://IP-КОМПЬЮТЕРА:8000
```

Например:

```text
http://192.168.1.100:8000
```

Для доступа к камере современные браузеры обычно требуют HTTPS. `localhost` является исключением для локальной разработки. Поэтому для полноценной работы камеры с телефона через IP следующим шагом стоит добавить HTTPS/reverse proxy.

## GitHub

Создай репозиторий на GitHub, затем:

```powershell
git init
git add .
git commit -m "Initial photo web app"
git branch -M main
git remote add origin https://github.com/USERNAME/photo-web-app.git
git push -u origin main
```

Не добавляй реальные фотографии в Git: папка `data/photos` уже исключена через `.gitignore`.
