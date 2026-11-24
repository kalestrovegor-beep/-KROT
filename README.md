# KROT API

Минимальный API-only сервис генерации изображений. Сайта и веб-интерфейса нет. API работает на Cloudflare Workers и Cloudflare Workers AI; модель по умолчанию — FLUX.1 Schnell.

## Развертывание

Нужны аккаунт Cloudflare с доступом к Workers и установленный Node.js/npm.

```bash
npm install
npx wrangler login
npx wrangler deploy
```

Cloudflare выдаст базовый URL примерно такого вида: `https://krot-api.<ваш-субдомен>.workers.dev`. Точный адрес будет показан после деплоя. Собственный домен не нужен.

Для локального запуска:

```bash
npm run dev
```

## Защитите API ключом

До публикации задайте секретный ключ, иначе endpoint будет доступен любому пользователю. Создайте длинный случайный ключ и выполните:

```bash
npx wrangler secret put API_KEY
```

Worker потребует этот ключ в заголовке `Authorization: Bearer ...`. `/health` оставлен общедоступным для проверки состояния.

## Endpoints

### Проверка состояния

```http
GET /health
```

Ответ: `{"status":"ok","service":"krot-api"}`.

### Генерация изображения

```http
POST /v1/images/generations
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

Тело запроса:

```json
{
  "prompt": "A small red fox in a snowy forest, cinematic lighting",
  "steps": 4,
  "seed": 123
}
```

`prompt` обязателен (до 2000 символов), `steps` — необязательное целое число от 1 до 8, `seed` — необязательное неотрицательное целое число.

Успешный ответ содержит изображение в base64:

```json
{
  "created": 1764000000,
  "data": [{ "b64_json": "..." }]
}
```

Пример вызова:

```bash
curl -X POST "https://YOUR-WORKER-URL/v1/images/generations" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"A small red fox in a snowy forest"}'
```

## Важно о бесплатном использовании

У Workers и Workers AI есть квоты и ограничения, которые Cloudflare может менять. Бесплатный URL `workers.dev` можно получить после публикации, но это не означает неограниченную или гарантированно бесплатную генерацию. Проверяйте актуальные лимиты и условия в панели Cloudflare. Не публикуйте API-ключ в браузерном коде или репозитории.
